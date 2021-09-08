/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import { uebaModel } from '.';

const actionCreator = actionCreatorFactory('x-pack/security_solution/local/ueba');

export const updateUebaTable = actionCreator<{
  uebaType: uebaModel.UebaType;
  tableType: uebaModel.UebaTableType | uebaModel.UebaTableType;
  updates: uebaModel.TableUpdates;
}>('UPDATE_NETWORK_TABLE');

export const setUebaDetailsTablesActivePageToZero = actionCreator(
  'SET_UEBA_DETAILS_TABLES_ACTIVE_PAGE_TO_ZERO'
);

export const setUebaTablesActivePageToZero = actionCreator('SET_UEBA_TABLES_ACTIVE_PAGE_TO_ZERO');

export const updateTableLimit = actionCreator<{
  uebaType: uebaModel.UebaType;
  limit: number;
  tableType: uebaModel.UebaTableType;
}>('UPDATE_UEBA_TABLE_LIMIT');

export const updateTableActivePage = actionCreator<{
  uebaType: uebaModel.UebaType;
  activePage: number;
  tableType: uebaModel.UebaTableType;
}>('UPDATE_UEBA_ACTIVE_PAGE');
