/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { Datafeed, Job } from '../../../../../../../common/types/anomaly_detection_jobs';

interface Response {
  runtime_mappings: RuntimeMappings;
  discarded_mappings: RuntimeMappings;
}

export function filterRuntimeMappings(job: Job, datafeed: Datafeed): Response {
  if (
    !(
      isPopulatedObject(datafeed, ['runtime_mappings']) &&
      isPopulatedObject(datafeed.runtime_mappings)
    )
  ) {
    return {
      runtime_mappings: {},
      discarded_mappings: {},
    };
  }

  const usedFields = findFieldsInJob(job, datafeed);

  const { runtimeMappings, discardedMappings } = createMappings(
    datafeed.runtime_mappings,
    usedFields
  );

  return { runtime_mappings: runtimeMappings, discarded_mappings: discardedMappings };
}

function findFieldsInJob(job: Job, datafeed: Datafeed) {
  const usedFields = new Set<string>();
  job.analysis_config.detectors.forEach((d) => {
    if (d.field_name !== undefined) {
      usedFields.add(d.field_name);
    }
    if (d.by_field_name !== undefined) {
      usedFields.add(d.by_field_name);
    }
    if (d.over_field_name !== undefined) {
      usedFields.add(d.over_field_name);
    }
    if (d.partition_field_name !== undefined) {
      usedFields.add(d.partition_field_name);
    }
  });

  if (job.analysis_config.categorization_field_name !== undefined) {
    usedFields.add(job.analysis_config.categorization_field_name);
  }

  if (job.analysis_config.summary_count_field_name !== undefined) {
    usedFields.add(job.analysis_config.summary_count_field_name);
  }

  if (job.analysis_config.influencers !== undefined) {
    job.analysis_config.influencers.forEach((i) => usedFields.add(i));
  }

  const aggs = datafeed.aggregations ?? datafeed.aggs;
  if (aggs !== undefined) {
    findFieldsInAgg(aggs).forEach((f) => usedFields.add(f));
  }

  const query = datafeed.query;
  if (query !== undefined) {
    findFieldsInQuery(query).forEach((f) => usedFields.add(f));
  }

  return [...usedFields];
}

function findFieldsInAgg(obj: Record<string, unknown>) {
  const fields: string[] = [];
  Object.entries(obj).forEach(([key, val]) => {
    if (isPopulatedObject(val)) {
      fields.push(...findFieldsInAgg(val));
    } else if (typeof val === 'string' && key === 'field') {
      fields.push(val);
    }
  });
  return fields;
}

function findFieldsInQuery(obj: object) {
  const fields: string[] = [];
  Object.entries(obj).forEach(([key, val]) => {
    // return all nested keys in the object
    // most will not be fields, but better to catch everything
    // and not accidentally remove a used runtime field.
    if (isPopulatedObject(val)) {
      fields.push(key);
      fields.push(...findFieldsInQuery(val));
    } else if (typeof val === 'string') {
      fields.push(val);
    } else {
      fields.push(key);
    }
  });
  return fields;
}

function createMappings(rm: RuntimeMappings, usedFieldNames: string[]) {
  return {
    runtimeMappings: usedFieldNames.reduce((acc, cur) => {
      if (rm[cur] !== undefined) {
        acc[cur] = rm[cur];
      }
      return acc;
    }, {} as RuntimeMappings),
    discardedMappings: Object.keys(rm).reduce((acc, cur) => {
      if (usedFieldNames.includes(cur) === false && rm[cur] !== undefined) {
        acc[cur] = rm[cur];
      }
      return acc;
    }, {} as RuntimeMappings),
  };
}
