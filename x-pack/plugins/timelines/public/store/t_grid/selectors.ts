/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getOr } from 'lodash/fp';
import { createSelector } from 'reselect';
import { TGridModel, State } from '.';
import { tGridDefaults, getTGridManageDefaults } from './defaults';

interface TGridById {
  [id: string]: TGridModel;
}

const getDefaultTgrid = (id: string) => ({ ...tGridDefaults, ...getTGridManageDefaults(id) });

const standaloneTGridById = (state: State): TGridById => state.timelineById;

export const activeCaseFlowId = createSelector(standaloneTGridById, (tGrid) => {
  return (
    tGrid &&
    Object.entries(tGrid)
      .map(([id, data]) => (data.isAddToExistingCaseOpen || data.isCreateNewCaseOpen ? id : null))
      .find((id) => id)
  );
});

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
