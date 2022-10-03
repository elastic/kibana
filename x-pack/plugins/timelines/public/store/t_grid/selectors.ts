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

const selectTGridById = (state: unknown, tableId: string): TGridModel => {
  return getOr(
    getOr(getDefaultTgrid(tableId), ['tableById', tableId], state),
    ['dataTable', 'tableById', tableId],
    state
  );
};

export const getTGridByIdSelector = () => createSelector(selectTGridById, (tGrid) => tGrid);

export const getManageDataTableById = () =>
  createSelector(
    selectTGridById,
    ({
      dataViewId,
      defaultColumns,
      isLoading,
      loadingText,
      queryFields,
      title,
      selectAll,
      graphEventId,
    }) => ({
      dataViewId,
      defaultColumns,
      isLoading,
      loadingText,
      queryFields,
      title,
      selectAll,
      graphEventId,
    })
  );
