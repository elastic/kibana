/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient } from 'kibana/server';

async function getShapesFilter(
  boundaryIndex: string,
  boundaryType: string,
  boundaryGeoField: string,
  isContained: boolean,
  callCluster: ILegacyScopedClusterClient['callAsCurrentUser'],
  log: Logger
) {
  const boolCheck = isContained ? 'should' : 'must_not';
  const shapesFilter = {
    bool: {
      [boolCheck]: [],
      minimum_should_match: 1,
    },
  };
  switch (boundaryType) {
    case 'entireIndex':
      // Get boundary shape data
      const boundaryData = await callCluster('search', {
        index: boundaryIndex,
        body: {},
      });
      boundaryData.hits.hits.forEach(({ _index, _id }) => {
        const path = boundaryGeoField;
        shapesFilter.bool[boolCheck].push({
          bool: {
            should: [
              {
                geo_shape: {
                  [path]: {
                    indexed_shape: {
                      index: _index,
                      id: _id,
                      path,
                    },
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        });
      });
      break;
    default:
      log.info(`Unsupported type: ${boundaryType}`);
  }
  return shapesFilter;
}

function executeEsQueryFactory(
  {
    entity,
    index,
    dateField,
    boundaryGeoField,
    boundaryIndex,
    boundaryType,
  }: {
    entity: string;
    index: string;
    dateField: string;
    boundaryGeoField: string;
    boundaryIndex: string;
    boundaryType: string;
  },
  { callCluster }: { callCluster: ILegacyScopedClusterClient['callAsCurrentUser'] },
  log: Logger
) {
  return async (
    gteDateTime: string,
    ltDateTime: string,
    isContained: boolean,
    topHitsQty: number = 1
  ) => {
    const esQuery: unknown = {
      index,
      body: {
        size: 0,
        aggs: {
          totalEntities: {
            cardinality: {
              precision_threshold: 1,
              field: entity,
            },
          },
          entitySplit: {
            terms: {
              size: 65535,
              shard_size: 65535,
              field: entity,
            },
            aggs: {
              entityHits: {
                top_hits: {
                  size: topHitsQty,
                  docvalue_fields: [entity, dateField],
                  _source: false,
                },
              },
            },
          },
        },
        stored_fields: ['*'],
        docvalue_fields: [
          {
            field: dateField,
            format: 'date_time',
          },
        ],
        query: {
          bool: {
            filter: [
              await getShapesFilter(
                boundaryIndex,
                boundaryType,
                boundaryGeoField,
                isContained,
                callCluster,
                log
              ),
              {
                range: {
                  [dateField]: {
                    ...(gteDateTime ? { gte: gteDateTime } : {}),
                    lt: ltDateTime,
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
            should: [],
            must_not: [],
          },
        },
      },
      ignoreUnavailable: true,
      allowNoIndices: true,
      ignore: [404],
    };

    console.log('*********************************');
    console.log(JSON.stringify(esQuery.body));
    console.log('*********************************');

    let esResult;
    try {
      esResult = await callCluster('search', esQuery);
    } catch (err) {
      log.warn(`${err.message}`);
    }
    return esResult;
  };
}

function getEntityDates(esQueryResults, dateField) {
  // console.log('ES QUERY RESULTS');
  // console.log(esQueryResults);
  if (!esQueryResults.aggregations) {
    return [];
  }

  const {
    aggregations: {
      entitySplit: { buckets: aggResults = [] },
    },
  } = esQueryResults;

  return aggResults.map((aggResult) => {
    const {
      key: entityName,
      entityHits: {
        hits: { hits: topAggHits },
      },
    } = aggResult;

    const {
      fields: { [dateField]: dates },
    } = topAggHits[0];
    return {
      name: entityName,
      dates,
    };
  });
}

function getAlertableEntities(prevEntityDates, currEntityDates) {
  // console.log('Last and current');
  // console.log(lastAlertEntities, currAlertEntities);
  // console.log('**********************');
  const lastAlertNames = prevEntityDates.map(({ name }) => name);
  const alertableEntities = [];
  currEntityDates.forEach(({ name, dates }) => {
    if (!lastAlertNames.includes(name)) {
      return;
    }
    if (dates.length > 1) {
      // Check that the prior hit isn't more recent than the one on the other side of the
      // shape(s). If it is, there was just a movement within the same space
      const otherSideEntity = lastAlertEntities.find(
        ({ name: lastEntityName }) => lastEntityName === name
      );
      const otherSideEntityTime = new Date(otherSideEntity.dates[0]).getTime();
      const lastDateInCurrentSpace =
        new Date(dates[0]).getTime() > new Date(dates[1]).getTime() ? dates[1] : dates[0];
      const currSideEntitySecondTime = new Date(lastDateInCurrentSpace).getTime();
      if (currSideEntitySecondTime > otherSideEntityTime) {
        return;
      }
    }
    alertableEntities.push(name);
  });
  // console.log('Alertable entities');
  // console.log(alertableEntities);
  return alertableEntities;
}

export const getGeoThresholdExecutor = ({ logger: log }: { logger: Logger }) =>
  async function ({
    previousStartedAt: currIntervalStartTime,
    startedAt: currIntervalEndTime,
    services,
    params,
  }: {
    previousStartedAt: unknown;
    startedAt: unknown;
    services: unknown;
    params: {
      index: string;
      geoField: string; // But also add support for this
      entity: string; //
      dateField: string; //
      trackingEvent: string; //
      boundaryType: string;
      boundaryIndex: string; //
      boundaryGeoField: string; //
    };
  }) {
    const executeEsQuery = executeEsQueryFactory(params, services, log);
    const trackingEvent = params.trackingEvent;
    const isContained = trackingEvent === 'entered';
    // Get top hits either inside or outside (dependent on value of `isContained`) of the shape(s)
    // for previous interval
    const prevToCurrentIntervalResults = await executeEsQuery(
      '',
      currIntervalStartTime,
      !isContained,
      1
    );
    // Get top hits opposite of previous shape(s) query for current interval
    const currentIntervalResults = await executeEsQuery(
      currIntervalStartTime,
      currIntervalEndTime,
      isContained,
      2 // Get one additional for later check this wasn't a movement in the same space
    );

    const prevEntityDates = getEntityDates(prevToCurrentIntervalResults, params.dateField);
    const currEntityDates = getEntityDates(currentIntervalResults, params.dateField);

    // Determine if any of the entities that were previously top hits inside or outside have
    // any top hits in the opposite space indicating a crossing event
    const alertableEntities = getAlertableEntities(prevEntityDates, currEntityDates);

    // console.log('*****************Alerting check run**********************');
    alertableEntities.forEach((entityName) =>
      services.alertInstanceFactory(entityName).scheduleActions('default')
    );
  };
