/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaults } from 'lodash';
import moment from 'moment';
import { MissingRequiredError } from './error_missing_required';
import { standaloneClusterFilter } from './standalone_clusters';
import { DS_INDEX_PATTERN_METRICS, STANDALONE_CLUSTER_CLUSTER_UUID } from '../../common/constants';

export interface TimerangeFilter {
  range: {
    [x: string]: {
      format: 'epoch_millis';
      gte?: number;
      lte?: number;
    };
  };
}

export function createTimeFilter(options: {
  start?: number;
  end?: number;
  metric?: { timestampField: string };
}) {
  const { start, end } = options;
  if (!start && !end) {
    return null;
  }

  const timestampField = options.metric?.timestampField;
  if (!timestampField) {
    throw new MissingRequiredError('metric.timestampField');
  }
  const timeRangeFilter: TimerangeFilter = {
    range: {
      [timestampField]: {
        format: 'epoch_millis',
      },
    },
  };
  if (start) {
    timeRangeFilter.range[timestampField].gte = moment.utc(start).valueOf();
  }
  if (end) {
    timeRangeFilter.range[timestampField].lte = moment.utc(end).valueOf();
  }
  return timeRangeFilter;
}

/*
 * Creates the boilerplace for querying monitoring data, including filling in
 * document UUIDs, start time and end time, and injecting additional filters.
 *
 * Options object:
 * @param {Array} options.types - `types` field values of the documents
 * @param {Array} options.filters - additional filters to add to the `bool` section of the query. Default: []
 * @param {string} options.clusterUuid - a UUID of the cluster. Required.
 * @param {string} options.uuid - a UUID of the metric to filter for, or `null` if UUID should not be part of the query
 * @param {Date} options.start - numeric timestamp (optional)
 * @param {Date} options.end - numeric timestamp (optional)
 * @param {Metric} options.metric - Metric instance or metric fields object @see ElasticsearchMetric.getMetricFields
 */
export function createQuery(options: {
  moduleType?: string;
  types?: string[];
  dsType?: string;
  filters?: any[];
  clusterUuid: string;
  uuid?: string;
  start?: number;
  end?: number;
  metric?: { uuidField?: string; timestampField: string };
}) {
  const {
    moduleType,
    types,
    clusterUuid,
    uuid,
    filters,
    dsType = DS_INDEX_PATTERN_METRICS,
  } = defaults(options, {
    filters: [],
  });
  // TODO: improve typing instead of having this
  if (types?.length && !moduleType) throw new Error('types must have a product type');

  const isFromStandaloneCluster = clusterUuid === STANDALONE_CLUSTER_CLUSTER_UUID;

  const typeFilter: any = {
    bool: {
      should: [{ term: { 'data_stream.type': dsType } }],
    },
  };
  if (types && types.length) {
    typeFilter.bool.should.push(
      ...types.map((t) => ({ term: { 'data_stream.name': `${moduleType}.${t}` } })),
      ...types.map((t) => ({ term: { type: t } })),
      ...types.map((t) => ({ term: { 'metricset.name': t } }))
    );
  }

  let clusterUuidFilter;
  if (clusterUuid && !isFromStandaloneCluster) {
    clusterUuidFilter = { term: { cluster_uuid: clusterUuid } };
  }

  let uuidFilter;
  // options.uuid can be null, for example getting all the clusters
  if (uuid) {
    const uuidField = options.metric?.uuidField;
    if (!uuidField) {
      throw new MissingRequiredError('options.uuid given but options.metric.uuidField is false');
    }
    uuidFilter = { term: { [uuidField]: uuid } };
  }

  const timestampField = options.metric?.timestampField;
  if (!timestampField) {
    throw new MissingRequiredError('metric.timestampField');
  }
  const timeRangeFilter = createTimeFilter(options);

  const combinedFilters = [
    typeFilter,
    clusterUuidFilter,
    uuidFilter,
    timeRangeFilter ?? undefined,
    ...filters,
  ];

  if (isFromStandaloneCluster) {
    combinedFilters.push(standaloneClusterFilter);
  }

  const query = {
    bool: {
      filter: combinedFilters.filter(Boolean),
    },
  };

  return query;
}
