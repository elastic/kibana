/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { estypes } from '@elastic/elasticsearch';
import {
  ALL_VALUE,
  syntheticsAvailabilityIndicatorSchema,
  occurrencesBudgetingMethodSchema,
  SyntheticsAvailabilityIndicator,
} from '@kbn/slo-schema';
import { getElasticsearchQueryOrThrow, TransformGenerator } from '.';
import {
  getSLOTransformId,
  SLO_DESTINATION_INDEX_NAME,
  SLO_INGEST_PIPELINE_NAME,
  SYNTHETICS_INDEX_PATTERN,
  SYNTHETICS_DEFAULT_GROUPINGS,
} from '../../../common/constants';
import { getSLOTransformTemplate } from '../../assets/transform_templates/slo_transform_template';
import { InvalidTransformError } from '../../errors';
import { SLODefinition } from '../../domain/models';
export class SyntheticsAvailabilityTransformGenerator extends TransformGenerator {
  public getTransformParams(slo: SLODefinition, spaceId: string): TransformPutTransformRequest {
    if (!syntheticsAvailabilityIndicatorSchema.is(slo.indicator)) {
      throw new InvalidTransformError(`Cannot handle SLO of indicator type: ${slo.indicator.type}`);
    }

    return getSLOTransformTemplate(
      this.buildTransformId(slo),
      this.buildDescription(slo),
      this.buildSource(slo, slo.indicator, spaceId),
      this.buildDestination(),
      this.buildGroupBy(slo, slo.indicator),
      this.buildAggregations(slo),
      this.buildSettings(slo, 'event.ingested'),
      slo
    );
  }

  private buildTransformId(slo: SLODefinition): string {
    return getSLOTransformId(slo.id, slo.revision);
  }

  private buildGroupBy(slo: SLODefinition, indicator: SyntheticsAvailabilityIndicator) {
    // These are the group by fields that will be used in `groupings` key
    // in the summary and rollup documents. For Synthetics, we want to use the
    // user-readible `monitor.name` and `observer.geo.name` fields by default,
    // unless otherwise specified by the user.
    const flattenedGroupBy = [slo.groupBy].flat().filter((value) => !!value);
    const groupings =
      flattenedGroupBy.length && !flattenedGroupBy.includes(ALL_VALUE)
        ? slo.groupBy
        : SYNTHETICS_DEFAULT_GROUPINGS;

    const hasTags =
      !indicator.params.tags?.find((param) => param.value === ALL_VALUE) &&
      indicator.params.tags?.length;
    const hasProjects =
      !indicator.params.projects?.find((param) => param.value === ALL_VALUE) &&
      indicator.params.projects?.length;
    const hasMonitorIds =
      !indicator.params.monitorIds?.find((param) => param.value === ALL_VALUE) &&
      indicator.params.monitorIds?.length;
    const includesDefaultGroupings =
      groupings.includes('monitor.name') && groupings.includes('observer.geo.name');
    // These groupBy fields must match the fields from the source query, otherwise
    // the transform will create permutations for each value present in the source.
    // E.g. if environment is not specified in the source query, but we include it in the groupBy,
    // we'll output documents for each environment value
    const extraGroupByFields = {
      /* additional fields needed to hyperlink back to the Synthetics app when
       * grouping by monitor.name and observer.geo.name.
       * `monitor.name` and `observer.geo.name` are the labels, while
       * observer.name and config_id are the values. We need the values
       * to build a URL back to Synthetics */
      ...(includesDefaultGroupings && {
        'observer.name': { terms: { field: 'observer.name' } },
        config_id: { terms: { field: 'config_id' } },
      }),
      ...(hasMonitorIds && { 'monitor.id': { terms: { field: 'monitor.id' } } }),
      ...(hasTags && {
        tags: { terms: { field: 'tags' } },
      }),
      ...(hasProjects && {
        'monitor.project.id': { terms: { field: 'monitor.project.id' } },
      }),
    };

    return this.buildCommonGroupBy(
      { ...slo, groupBy: groupings },
      '@timestamp',
      extraGroupByFields
    );
  }

  private buildSource(
    slo: SLODefinition,
    indicator: SyntheticsAvailabilityIndicator,
    spaceId: string
  ) {
    const queryFilter: estypes.QueryDslQueryContainer[] = [
      { term: { 'summary.final_attempt': true } },
      { term: { 'meta.space_id': spaceId } },
      {
        range: {
          '@timestamp': {
            gte: `now-${slo.timeWindow.duration.format()}/d`,
          },
        },
      },
    ];
    const { monitorIds, tags, projects } = buildParamValues({
      monitorIds: indicator.params.monitorIds || [],
      tags: indicator.params.tags || [],
      projects: indicator.params.projects || [],
    });

    if (!monitorIds.includes(ALL_VALUE) && monitorIds.length) {
      queryFilter.push({
        terms: {
          'monitor.id': monitorIds,
        },
      });
    }

    if (!tags.includes(ALL_VALUE) && tags.length) {
      queryFilter.push({
        terms: {
          tags,
        },
      });
    }

    if (!projects.includes(ALL_VALUE) && projects.length) {
      queryFilter.push({
        terms: {
          'monitor.project.id': projects,
        },
      });
    }

    if (!!indicator.params.filter) {
      queryFilter.push(getElasticsearchQueryOrThrow(indicator.params.filter));
    }

    return {
      index: SYNTHETICS_INDEX_PATTERN,
      runtime_mappings: {
        ...this.buildCommonRuntimeMappings(slo),
      },
      query: {
        bool: {
          filter: queryFilter,
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

  private buildAggregations(slo: SLODefinition) {
    if (!occurrencesBudgetingMethodSchema.is(slo.budgetingMethod)) {
      throw new Error(
        'The sli.synthetics.availability indicator MUST have an occurances budgeting method.'
      );
    }

    return {
      'slo.numerator': {
        filter: {
          term: {
            'monitor.status': 'up',
          },
        },
      },
      'slo.denominator': {
        filter: {
          term: {
            'summary.final_attempt': true,
          },
        },
      },
    };
  }
}

export const buildParamValues = (
  params: Record<string, Array<{ label: string; value: string }>>
): Record<string, string[]> => {
  return Object.keys(params).reduce((acc, key) => {
    return {
      ...acc,
      [key]: params[key]?.map((p) => p.value),
    };
  }, {});
};
