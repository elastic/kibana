/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  ALL_VALUE,
  syntheticsAvailabilityIndicatorSchema,
  timeslicesBudgetingMethodSchema,
} from '@kbn/slo-schema';
import { TransformGenerator } from '.';
import {
  getSLOTransformId,
  SLO_DESTINATION_INDEX_NAME,
  SLO_INGEST_PIPELINE_NAME,
} from '../../../assets/constants';
import { getSLOTransformTemplate } from '../../../assets/transform_templates/slo_transform_template';
import { SyntheticsAvailabilityIndicator, SLO } from '../../../domain/models';
import { InvalidTransformError } from '../../../errors';
// import { parseIndex } from './common';
import { Query } from './types';

export class SyntheticsAvailabilityTransformGenerator extends TransformGenerator {
  public getTransformParams(slo: SLO): TransformPutTransformRequest {
    if (!syntheticsAvailabilityIndicatorSchema.is(slo.indicator)) {
      throw new InvalidTransformError(`Cannot handle SLO of indicator type: ${slo.indicator.type}`);
    }

    return getSLOTransformTemplate(
      this.buildTransformId(slo),
      this.buildDescription(slo),
      this.buildSource(slo, slo.indicator),
      this.buildDestination(),
      this.buildGroupBy(slo, slo.indicator),
      this.buildAggregations(slo),
      this.buildSettings(slo)
    );
  }

  private buildTransformId(slo: SLO): string {
    return getSLOTransformId(slo.id, slo.revision);
  }

  private buildGroupBy(slo: SLO, indicator: SyntheticsAvailabilityIndicator) {
    // These groupBy fields must match the fields from the source query, otherwise
    // the transform will create permutations for each value present in the source.
    // E.g. if environment is not specified in the source query, but we include it in the groupBy,
    // we'll output documents for each environment value
    const extraGroupByFields = {
      'observer.name': { terms: { field: 'observer.name' } },
      'monitor.id': { terms: { field: 'monitor.id' } },
      ...(!indicator.params.tags?.find((param) => param.value === ALL_VALUE) && {
        tags: { terms: { field: 'tags' } },
      }),
      ...(!indicator.params.projects?.find((param) => param.value === ALL_VALUE) && {
        'monitor.project.id': { terms: { field: 'monitor.project.id' } },
      }),
    };

    return this.buildCommonGroupBy(slo, '@timestamp', extraGroupByFields);
  }

  private buildSource(slo: SLO, indicator: SyntheticsAvailabilityIndicator) {
    const queryFilter: Query[] = [
      {
        range: {
          '@timestamp': {
            gte: `now-${slo.timeWindow.duration.format()}/d`,
          },
        },
      },
    ];
    const { monitorIds, tags, projects } = buildParamValues(indicator.params);

    if (!monitorIds.includes(ALL_VALUE)) {
      queryFilter.push({
        match: {
          'monitor.id': monitorIds[0],
        },
      });
    }

    if (!tags.includes(ALL_VALUE)) {
      queryFilter.push({
        match: {
          tags,
        },
      });
    }

    if (!projects.includes(ALL_VALUE)) {
      queryFilter.push({
        match: {
          'monitor.project.id': projects,
        },
      });
    }

    // if (!!indicator.params.filter) {
    //   queryFilter.push(getElastichsearchQueryOrThrow(indicator.params.filter));
    // }

    return {
      index: 'synthetics-*',
      runtime_mappings: {
        ...this.buildCommonRuntimeMappings(slo),
      },
      query: {
        bool: {
          filter: [{ term: { 'summary.final_attempt': true } }, ...queryFilter],
        },
      },
    };
  }

  private buildDestination() {
    return {
      pipeline: SLO_INGEST_PIPELINE_NAME,
      index: SLO_DESTINATION_INDEX_NAME,
    };
  }

  private buildAggregations(slo: SLO) {
    return {
      'slo.numerator': {
        filter: {
          range: {
            'summary.up': {
              gte: 1,
            },
          },
        },
      },
      'slo.denominator': {
        filter: {
          exists: {
            field: 'summary.final_attempt',
          },
        },
      },
      ...(timeslicesBudgetingMethodSchema.is(slo.budgetingMethod) && {
        'slo.isGoodSlice': {
          bucket_script: {
            buckets_path: {
              goodEvents: 'slo.numerator>_count',
              totalEvents: 'slo.denominator>_count',
            },
            script: `params.goodEvents / params.totalEvents >= ${slo.objective.timesliceTarget} ? 1 : 0`,
          },
        },
      }),
    };
  }
}

export const buildParamValues = (
  params: SyntheticsAvailabilityIndicator['params']
): Record<keyof SyntheticsAvailabilityIndicator['params'], string[]> => {
  return (Object.keys(params) as Array<keyof SyntheticsAvailabilityIndicator['params']>).reduce(
    (acc, key) => {
      return {
        ...acc,
        [key]: params[key]?.map((p) => p.value),
      };
    },
    {} as Record<keyof SyntheticsAvailabilityIndicator['params'], string[]>
  );
};
