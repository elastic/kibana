/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuntimeMappings } from '../../../../../../../common/types/fields';
import type { Datafeed, Job } from '../../../../../../../common/types/anomaly_detection_jobs';

interface Response {
  runtime_mappings: RuntimeMappings;
  discarded_mappings: RuntimeMappings;
}

export function filterRuntimeMappings(job: Job, datafeed: Datafeed): Response {
  if (datafeed.runtime_mappings === undefined) {
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

  return [...usedFields];
}

function findFieldsInAgg(obj: Record<string, any>) {
  const fields: string[] = [];
  Object.entries(obj).forEach(([key, val]) => {
    if (typeof val === 'object' && val !== null) {
      fields.push(...findFieldsInAgg(val));
    } else if (typeof val === 'string' && key === 'field') {
      fields.push(val);
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
