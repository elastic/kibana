/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { createGraphqlStateSelectors } from '../../../utils/remote_state/remote_graphql_state';
import { SourceRemoteState } from './state';

const sourceStatusGraphqlStateSelectors = createGraphqlStateSelectors<SourceRemoteState>();

export const selectSource = sourceStatusGraphqlStateSelectors.selectData;

export const selectSourceConfiguration = createSelector(
  selectSource,
  source => (source ? source.configuration : null)
);

export const selectSourceLogAlias = createSelector(
  selectSourceConfiguration,
  configuration => (configuration ? configuration.logAlias : null)
);

export const selectSourceMetricAlias = createSelector(
  selectSourceConfiguration,
  configuration => (configuration ? configuration.metricAlias : null)
);

export const selectSourceFields = createSelector(
  selectSourceConfiguration,
  configuration => (configuration ? configuration.fields : null)
);

export const selectSourceStatus = createSelector(
  selectSource,
  source => (source ? source.status : null)
);

export const selectSourceLogIndicesExist = createSelector(
  selectSourceStatus,
  sourceStatus => (sourceStatus ? sourceStatus.logIndicesExist : null)
);

export const selectSourceMetricIndicesExist = createSelector(
  selectSourceStatus,
  sourceStatus => (sourceStatus ? sourceStatus.metricIndicesExist : null)
);

export const selectSourceIndexFields = createSelector(
  selectSourceStatus,
  sourceStatus => (sourceStatus ? sourceStatus.indexFields : [])
);

export const selectDerivedIndexPattern = createSelector(
  selectSourceIndexFields,
  selectSourceLogAlias,
  selectSourceMetricAlias,
  (indexFields, logAlias, metricAlias) => ({
    fields: indexFields,
    title: `${logAlias},${metricAlias}`,
  })
);
