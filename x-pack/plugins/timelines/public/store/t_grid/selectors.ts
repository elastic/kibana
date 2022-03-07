/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getOr } from 'lodash/fp';
import { createSelector } from 'reselect';
import { TGridModel } from '.';
import { tGridDefaults, getTGridManageDefaults } from './defaults';

const getDefaultTgrid = (id: string) => ({ ...tGridDefaults, ...getTGridManageDefaults(id) });

export const selectTGridById = (state: unknown, timelineId: string): TGridModel => {
  return getOr(
    getOr(getDefaultTgrid(timelineId), ['timelineById', timelineId], state),
    ['timeline', 'timelineById', timelineId],
    state
  );
};

export const getTGridByIdSelector = () => createSelector(selectTGridById, (tGrid) => tGrid);

export const getManageTimelineById = () =>
  createSelector(
    selectTGridById,
    ({
      dataViewId,
      documentType,
      defaultColumns,
      isLoading,
      filterManager,
      footerText,
      loadingText,
      queryFields,
      selectAll,
      title,
    }) => ({
      dataViewId,
      documentType,
      defaultColumns,
      isLoading,
      filterManager,
      footerText,
      loadingText,
      queryFields,
      selectAll,
      title,
    })
  );
