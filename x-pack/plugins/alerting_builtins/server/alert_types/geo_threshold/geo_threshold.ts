/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { executeEsQueryFactory } from './es_query_builder';
import { AlertServices } from '../../../../alerts/server';
import { BoundaryType, TrackingEvent } from './alert_type';

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
    previousStartedAt: Date | null;
    startedAt: Date;
    services: AlertServices;
    params: {
      index: string;
      geoField: string; // But also add support for this
      entity: string; //
      dateField: string; //
      trackingEvent: TrackingEvent; //
      boundaryType: BoundaryType;
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
