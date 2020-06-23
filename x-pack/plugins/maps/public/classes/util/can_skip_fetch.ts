/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
// @ts-ignore
import turf from 'turf';
import turfBooleanContains from '@turf/boolean-contains';
import { isRefreshOnlyQuery } from './is_refresh_only_query';
import { ISource } from '../sources/source';
import { DataMeta } from '../../../common/descriptor_types';
import { DataRequest } from './data_request';

const SOURCE_UPDATE_REQUIRED = true;
const NO_SOURCE_UPDATE_REQUIRED = false;

export function updateDueToExtent(prevMeta: DataMeta = {}, nextMeta: DataMeta = {}) {
  const { buffer: previousBuffer } = prevMeta;
  const { buffer: newBuffer } = nextMeta;

  if (!previousBuffer || !previousBuffer || !newBuffer) {
    return SOURCE_UPDATE_REQUIRED;
  }

  if (_.isEqual(previousBuffer, newBuffer)) {
    return NO_SOURCE_UPDATE_REQUIRED;
  }

  const previousBufferGeometry = turf.bboxPolygon([
    previousBuffer.minLon,
    previousBuffer.minLat,
    previousBuffer.maxLon,
    previousBuffer.maxLat,
  ]);
  const newBufferGeometry = turf.bboxPolygon([
    newBuffer.minLon,
    newBuffer.minLat,
    newBuffer.maxLon,
    newBuffer.maxLat,
  ]);
  const doesPreviousBufferContainNewBuffer = turfBooleanContains(
    previousBufferGeometry,
    newBufferGeometry
  );

  const isTrimmed = _.get(prevMeta, 'areResultsTrimmed', false);
  return doesPreviousBufferContainNewBuffer && !isTrimmed
    ? NO_SOURCE_UPDATE_REQUIRED
    : SOURCE_UPDATE_REQUIRED;
}

export async function canSkipSourceUpdate({
  source,
  prevDataRequest,
  nextMeta,
}: {
  source: ISource;
  prevDataRequest: DataRequest | undefined;
  nextMeta: DataMeta;
}): Promise<boolean> {
  const timeAware = await source.isTimeAware();
  const refreshTimerAware = await source.isRefreshTimerAware();
  const extentAware = source.isFilterByMapBounds();
  const isFieldAware = source.isFieldAware();
  const isQueryAware = source.isQueryAware();
  const isGeoGridPrecisionAware = source.isGeoGridPrecisionAware();

  if (
    !timeAware &&
    !refreshTimerAware &&
    !extentAware &&
    !isFieldAware &&
    !isQueryAware &&
    !isGeoGridPrecisionAware
  ) {
    return !!prevDataRequest && prevDataRequest.hasDataOrRequestInProgress();
  }

  if (!prevDataRequest) {
    return false;
  }
  const prevMeta = prevDataRequest.getMeta();
  if (!prevMeta) {
    return false;
  }

  let updateDueToTime = false;
  if (timeAware) {
    updateDueToTime = !_.isEqual(prevMeta.timeFilters, nextMeta.timeFilters);
  }

  let updateDueToRefreshTimer = false;
  if (refreshTimerAware && nextMeta.refreshTimerLastTriggeredAt) {
    updateDueToRefreshTimer = !_.isEqual(
      prevMeta.refreshTimerLastTriggeredAt,
      nextMeta.refreshTimerLastTriggeredAt
    );
  }

  let updateDueToFields = false;
  if (isFieldAware) {
    updateDueToFields = !_.isEqual(prevMeta.fieldNames, nextMeta.fieldNames);
  }

  let updateDueToQuery = false;
  let updateDueToFilters = false;
  let updateDueToSourceQuery = false;
  let updateDueToApplyGlobalQuery = false;
  if (isQueryAware) {
    updateDueToApplyGlobalQuery = prevMeta.applyGlobalQuery !== nextMeta.applyGlobalQuery;
    updateDueToSourceQuery = !_.isEqual(prevMeta.sourceQuery, nextMeta.sourceQuery);
    if (nextMeta.applyGlobalQuery) {
      updateDueToQuery = !_.isEqual(prevMeta.query, nextMeta.query);
      updateDueToFilters = !_.isEqual(prevMeta.filters, nextMeta.filters);
    } else {
      // Global filters and query are not applied to layer search request so no re-fetch required.
      // Exception is "Refresh" query.
      updateDueToQuery = isRefreshOnlyQuery(prevMeta.query, nextMeta.query);
    }
  }

  let updateDueToPrecisionChange = false;
  if (isGeoGridPrecisionAware) {
    updateDueToPrecisionChange = !_.isEqual(prevMeta.geogridPrecision, nextMeta.geogridPrecision);
  }

  let updateDueToExtentChange = false;
  if (extentAware) {
    updateDueToExtentChange = updateDueToExtent(prevMeta, nextMeta);
  }

  const updateDueToSourceMetaChange = !_.isEqual(prevMeta.sourceMeta, nextMeta.sourceMeta);

  return (
    !updateDueToTime &&
    !updateDueToRefreshTimer &&
    !updateDueToExtentChange &&
    !updateDueToFields &&
    !updateDueToQuery &&
    !updateDueToFilters &&
    !updateDueToSourceQuery &&
    !updateDueToApplyGlobalQuery &&
    !updateDueToPrecisionChange &&
    !updateDueToSourceMetaChange
  );
}

export function canSkipStyleMetaUpdate({
  prevDataRequest,
  nextMeta,
}: {
  prevDataRequest: DataRequest | undefined;
  nextMeta: DataMeta;
}): boolean {
  if (!prevDataRequest) {
    return false;
  }
  const prevMeta = prevDataRequest.getMeta();
  if (!prevMeta) {
    return false;
  }

  const updateDueToFields = !_.isEqual(prevMeta.dynamicStyleFields, nextMeta.dynamicStyleFields);

  const updateDueToSourceQuery = !_.isEqual(prevMeta.sourceQuery, nextMeta.sourceQuery);

  const updateDueToIsTimeAware = nextMeta.isTimeAware !== prevMeta.isTimeAware;
  const updateDueToTime = nextMeta.isTimeAware
    ? !_.isEqual(prevMeta.timeFilters, nextMeta.timeFilters)
    : false;

  return (
    !updateDueToFields && !updateDueToSourceQuery && !updateDueToIsTimeAware && !updateDueToTime
  );
}

export function canSkipFormattersUpdate({
  prevDataRequest,
  nextMeta,
}: {
  prevDataRequest: DataRequest | undefined;
  nextMeta: DataMeta;
}): boolean {
  if (!prevDataRequest) {
    return false;
  }
  const prevMeta = prevDataRequest.getMeta();
  if (!prevMeta) {
    return false;
  }

  return _.isEqual(prevMeta.fieldNames, nextMeta.fieldNames);
}
