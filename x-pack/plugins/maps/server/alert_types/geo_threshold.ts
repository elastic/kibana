/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyApiCaller } from 'kibana/server';
import { APP_ID } from '../../common/constants';

function getShapesFilter(type: string, shapesArr: unknown[], isContained: boolean) {
  const boolCheck = isContained ? 'should' : 'must_not';
  const shapesFilter = {
    bool: {
      [boolCheck]: [],
      minimum_should_match: 1,
    },
  };
  switch (type) {
    case 'indexedShapes':
      shapesArr.forEach((shape: unknown) => {
        const { index, id, path } = shape;
        shapesFilter.bool[boolCheck].push({
          bool: {
            should: [
              {
                geo_shape: {
                  [path]: {
                    indexed_shape: {
                      index,
                      id,
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
      console.error(`Unsupported type: ${type}`);
  }
  return shapesFilter;
}

function executeEsQueryFactory(
  {
    entity,
    index,
    dateField,
    shapesArr,
    type,
  }: {
    entity: string;
    index: string;
    dateField: string;
    shapesArr: unknown[];
    type: string;
  },
  { callCluster, log }: { callCluster: LegacyApiCaller; log: unknown }
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
              getShapesFilter(type, shapesArr, isContained),
              {
                range: {
                  [dateField]: {
                    gte: gteDateTime,
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

    // console.log('*********************************');
    // console.log(JSON.stringify(esQuery.body));
    // console.log('*********************************');

    let esResult;
    try {
      esResult = await callCluster('search', esQuery);
    } catch (err) {
      // log.warn(['warn', 'maps']`${err.message}`);
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

export const alertType: {
  defaultActionGroupId: string;
  actionVariables: any[];
  actionGroups: Array<{ name: string; id: string }>;
  executor({
    startedAt,
    previousStartedAt,
    services: { callCluster, log },
    params,
  }: {
    services: { callCluster: any; log: any };
    params: any;
  }): Promise<{ results: any[] } | {}>;
  name: string;
  producer: string;
  id: string;
} = {
  id: '.geo-threshold',
  name: 'Check if one or more documents has entered or left a defined geo area',
  actionGroups: [{ id: 'default', name: 'default' }],
  defaultActionGroupId: 'default',
  actionVariables: [],
  async executor({
    previousStartedAt: currIntervalStartTime,
    startedAt: currIntervalEndTime,
    services,
    params,
  }) {
    const executeEsQuery = executeEsQueryFactory(params, services);
    const trackingEvent = params.trackingEvent;
    const isContained = trackingEvent === 'entered';
    // Get top hits either inside or outside (dependent on value of `isContained`) of the shape(s)
    // for previous interval
    const prevToCurrentIntervalResults = await executeEsQuery(
      null,
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
  },
  producer: APP_ID,
};
