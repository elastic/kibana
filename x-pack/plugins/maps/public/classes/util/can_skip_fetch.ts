/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import turfBboxPolygon from '@turf/bbox-polygon';
import turfBooleanContains from '@turf/boolean-contains';
import { ISource } from '../sources/source';
import { DataRequestMeta, Timeslice } from '../../../common/descriptor_types';
import { DataRequest } from './data_request';

const SOURCE_UPDATE_REQUIRED = true;
const NO_SOURCE_UPDATE_REQUIRED = false;

export function updateDueToExtent(prevMeta: DataRequestMeta = {}, nextMeta: DataRequestMeta = {}) {
  const { buffer: previousBuffer } = prevMeta;
  const { buffer: newBuffer } = nextMeta;

  if (!previousBuffer || !previousBuffer || !newBuffer) {
    return SOURCE_UPDATE_REQUIRED;
  }

  if (_.isEqual(previousBuffer, newBuffer)) {
    return NO_SOURCE_UPDATE_REQUIRED;
  }

  const previousBufferGeometry = turfBboxPolygon([
    previousBuffer.minLon,
    previousBuffer.minLat,
    previousBuffer.maxLon,
    previousBuffer.maxLat,
  ]);
  const newBufferGeometry = turfBboxPolygon([
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
  nextRequestMeta,
  extentAware,
  getUpdateDueToTimeslice,
}: {
  source: ISource;
  prevDataRequest: DataRequest | undefined;
  nextRequestMeta: DataRequestMeta;
  extentAware: boolean;
  getUpdateDueToTimeslice: (timeslice?: Timeslice) => boolean;
}): Promise<boolean> {
  const mustForceRefresh = nextRequestMeta.isForceRefresh && nextRequestMeta.applyForceRefresh;
  if (mustForceRefresh) {
    // Cannot skip
    return false;
  }

  const timeAware = await source.isTimeAware();
  const isFieldAware = source.isFieldAware();
  const isQueryAware = source.isQueryAware();
  const isGeoGridPrecisionAware = source.isGeoGridPrecisionAware();

  if (!timeAware && !extentAware && !isFieldAware && !isQueryAware && !isGeoGridPrecisionAware) {
    return !!prevDataRequest && prevDataRequest.hasDataOrRequestInProgress();
  }

  if (!prevDataRequest) {
    return false;
  }
  const prevMeta = prevDataRequest.getMeta();
  if (!prevMeta) {
    return false;
  }

  if (prevMeta.isFeatureEditorOpenForLayer !== nextRequestMeta.isFeatureEditorOpenForLayer) {
    return false;
  }

  let updateDueToApplyGlobalTime = false;
  let updateDueToTime = false;
  let updateDueToTimeslice = false;
  if (timeAware) {
    updateDueToApplyGlobalTime = prevMeta.applyGlobalTime !== nextRequestMeta.applyGlobalTime;
    if (nextRequestMeta.applyGlobalTime) {
      updateDueToTime = !_.isEqual(prevMeta.timeFilters, nextRequestMeta.timeFilters);
      if (!_.isEqual(prevMeta.timeslice, nextRequestMeta.timeslice)) {
        updateDueToTimeslice = getUpdateDueToTimeslice(nextRequestMeta.timeslice);
      }
    }
  }

  let updateDueToFields = false;
  if (isFieldAware) {
    updateDueToFields = !_.isEqual(prevMeta.fieldNames, nextRequestMeta.fieldNames);
  }

  let updateDueToQuery = false;
  let updateDueToFilters = false;
  let updateDueToSourceQuery = false;
  let updateDueToApplyGlobalQuery = false;
  if (isQueryAware) {
    updateDueToApplyGlobalQuery = prevMeta.applyGlobalQuery !== nextRequestMeta.applyGlobalQuery;
    updateDueToSourceQuery = !_.isEqual(prevMeta.sourceQuery, nextRequestMeta.sourceQuery);

    if (nextRequestMeta.applyGlobalQuery) {
      updateDueToQuery = !_.isEqual(prevMeta.query, nextRequestMeta.query);
      updateDueToFilters = !_.isEqual(prevMeta.filters, nextRequestMeta.filters);
    }
  }

  let updateDueToSearchSessionId = false;
  if ((timeAware || isQueryAware) && nextRequestMeta.applyForceRefresh) {
    // If the force-refresh flag is turned off, we should ignore refreshes on the dashboard-context
    updateDueToSearchSessionId = prevMeta.searchSessionId !== nextRequestMeta.searchSessionId;
  }

  let updateDueToPrecisionChange = false;
  let updateDueToExtentChange = false;

  if (isGeoGridPrecisionAware) {
    updateDueToPrecisionChange = !_.isEqual(
      prevMeta.geogridPrecision,
      nextRequestMeta.geogridPrecision
    );
  }

  if (extentAware) {
    updateDueToExtentChange = updateDueToExtent(prevMeta, nextRequestMeta);
  }

  const updateDueToSourceMetaChange = !_.isEqual(prevMeta.sourceMeta, nextRequestMeta.sourceMeta);

  return (
    !updateDueToApplyGlobalTime &&
    !updateDueToTime &&
    !updateDueToTimeslice &&
    !updateDueToExtentChange &&
    !updateDueToFields &&
    !updateDueToQuery &&
    !updateDueToFilters &&
    !updateDueToSourceQuery &&
    !updateDueToApplyGlobalQuery &&
    !updateDueToPrecisionChange &&
    !updateDueToSourceMetaChange &&
    !updateDueToSearchSessionId
  );
}

export function canSkipStyleMetaUpdate({
  prevDataRequest,
  nextMeta,
}: {
  prevDataRequest: DataRequest | undefined;
  nextMeta: DataRequestMeta;
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

  const updateDueToSearchSessionId = prevMeta.searchSessionId !== nextMeta.searchSessionId;

  return (
    !updateDueToFields &&
    !updateDueToSourceQuery &&
    !updateDueToIsTimeAware &&
    !updateDueToTime &&
    !updateDueToSearchSessionId
  );
}

export function canSkipFormattersUpdate({
  prevDataRequest,
  nextMeta,
}: {
  prevDataRequest: DataRequest | undefined;
  nextMeta: DataRequestMeta;
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
