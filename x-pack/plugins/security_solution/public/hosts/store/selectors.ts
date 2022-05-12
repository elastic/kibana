/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import { createSelector } from 'reselect';

import { State } from '../../common/store/types';

import { GenericHostsModel, HostsType, HostsTableType } from './model';

const selectHosts = (state: State, hostsType: HostsType): GenericHostsModel =>
  get(hostsType, state.hosts);

export const authenticationsSelector = () =>
  createSelector(selectHosts, (hosts) => hosts.queries.authentications);

export const hostsSelector = () =>
  createSelector(selectHosts, (hosts) => hosts.queries[HostsTableType.hosts]);

export const hostRiskScoreSelector = () =>
  createSelector(selectHosts, (hosts) => hosts.queries[HostsTableType.risk]);

export const hostRiskScoreSeverityFilterSelector = () =>
  createSelector(selectHosts, (hosts) => hosts.queries[HostsTableType.risk].severitySelection);

export const eventsSelector = () => createSelector(selectHosts, (hosts) => hosts.queries.events);

export const uncommonProcessesSelector = () =>
  createSelector(selectHosts, (hosts) => hosts.queries.uncommonProcesses);

export const alertsSelector = () =>
  createSelector(selectHosts, (hosts) => hosts.queries[HostsTableType.alerts]);
