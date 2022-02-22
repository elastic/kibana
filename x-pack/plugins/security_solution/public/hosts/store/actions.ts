/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import { RiskScoreSortField, RiskSeverity } from '../../../common/search_strategy';
import { HostsSortField } from '../../../common/search_strategy/security_solution/hosts';

import { HostsTableType, HostsType } from './model';
const actionCreator = actionCreatorFactory('x-pack/security_solution/local/hosts');

export const updateTableActivePage = actionCreator<{
  activePage: number;
  hostsType: HostsType;
  tableType: HostsTableType;
}>('UPDATE_HOST_TABLE_ACTIVE_PAGE');

export const setHostTablesActivePageToZero = actionCreator('SET_HOST_TABLES_ACTIVE_PAGE_TO_ZERO');

export const setHostDetailsTablesActivePageToZero = actionCreator(
  'SET_HOST_DETAILS_TABLES_ACTIVE_PAGE_TO_ZERO'
);

export const updateTableLimit = actionCreator<{
  hostsType: HostsType;
  limit: number;
  tableType: HostsTableType;
}>('UPDATE_HOST_TABLE_LIMIT');

export const updateHostsSort = actionCreator<{
  sort: HostsSortField;
  hostsType: HostsType;
}>('UPDATE_HOSTS_SORT');

export const updateHostRiskScoreSort = actionCreator<{
  sort: RiskScoreSortField;
  hostsType: HostsType;
}>('UPDATE_HOST_RISK_SCORE_SORT');

export const updateHostRiskScoreSeverityFilter = actionCreator<{
  severitySelection: RiskSeverity[];
  hostsType: HostsType;
}>('UPDATE_HOST_RISK_SCORE_SEVERITY');
