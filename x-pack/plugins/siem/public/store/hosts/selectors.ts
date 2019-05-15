/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import { createSelector } from 'reselect';

import { isFromKueryExpressionValid } from '../../lib/keury';
import { State } from '../reducer';

import { GenericHostsModel, HostsType } from './model';

const selectHosts = (state: State, hostsType: HostsType): GenericHostsModel =>
  get(hostsType, state.hosts);

export const authenticationsSelector = () =>
  createSelector(
    selectHosts,
    hosts => hosts.queries.authentications
  );

export const hostsSelector = () =>
  createSelector(
    selectHosts,
    hosts => hosts.queries.hosts
  );

export const eventsSelector = () =>
  createSelector(
    selectHosts,
    hosts => hosts.queries.events
  );

export const uncommonProcessesSelector = () =>
  createSelector(
    selectHosts,
    hosts => hosts.queries.uncommonProcesses
  );

export const hostsFilterQueryExpression = () =>
  createSelector(
    selectHosts,
    hosts => (hosts.filterQuery ? hosts.filterQuery.query.expression : null)
  );

export const hostsFilterQueryAsJson = () =>
  createSelector(
    selectHosts,
    hosts => (hosts.filterQuery ? hosts.filterQuery.serializedQuery : null)
  );

export const hostsFilterQueryDraft = () =>
  createSelector(
    selectHosts,
    hosts => hosts.filterQueryDraft
  );

export const isHostFilterQueryDraftValid = () =>
  createSelector(
    selectHosts,
    hosts => isFromKueryExpressionValid(hosts.filterQueryDraft)
  );
