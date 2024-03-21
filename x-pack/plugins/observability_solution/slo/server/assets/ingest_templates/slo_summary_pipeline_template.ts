/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';
import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import { IBasePath } from '@kbn/core-http-server';
import { getSLOSummaryPipelineId, SLO_RESOURCES_VERSION } from '../../../common/constants';
import { SLO } from '../../domain/models';

export const getSLOSummaryPipelineTemplate = (
  slo: SLO,
  spaceId: string,
  basePath: IBasePath
): IngestPutPipelineRequest => {
  const errorBudgetEstimated =
    slo.budgetingMethod === 'occurrences' && slo.timeWindow.type === 'calendarAligned';

  const optionalObjectiveTimesliceProcessors = timeslicesBudgetingMethodSchema.is(
    slo.budgetingMethod
  )
    ? [
        {
          set: {
            description: 'Set objective.timesliceTarget field',
            field: 'slo.objective.timesliceTarget',
            value: slo.objective.timesliceTarget,
          },
        },
        {
          set: {
            description: 'Set objective.timesliceWindow field',
            field: 'slo.objective.timesliceWindow',
            value: slo.objective.timesliceWindow!.format(),
          },
        },
      ]
    : [];

  return {
    id: getSLOSummaryPipelineId(slo.id, slo.revision),
    description: `Ingest pipeline for SLO summary data [id: ${slo.id}, revision: ${slo.revision}]`,
    processors: [
      {
        set: {
          description: 'Set errorBudgetEstimated field',
          field: 'errorBudgetEstimated',
          value: errorBudgetEstimated,
        },
      },
      {
        set: {
          description: 'Set isTempDoc field',
          field: 'isTempDoc',
          value: false,
        },
      },
      {
        set: {
          description: 'Set groupBy field',
          field: 'slo.groupBy',
          value: slo.groupBy,
        },
      },
      {
        set: {
          description: 'Set name field',
          field: 'slo.name',
          value: slo.name,
        },
      },
      {
        set: {
          description: 'Set description field',
          field: 'slo.description',
          value: slo.description,
        },
      },
      {
        set: {
          description: 'Set tags field',
          field: 'slo.tags',
          value: slo.tags,
        },
      },
      {
        set: {
          description: 'Set indicator.type field',
          field: 'slo.indicator.type',
          value: slo.indicator.type,
        },
      },
      {
        set: {
          description: 'Set budgetingMethod field',
          field: 'slo.budgetingMethod',
          value: slo.budgetingMethod,
        },
      },
      {
        set: {
          description: 'Set timeWindow.duration field',
          field: 'slo.timeWindow.duration',
          value: slo.timeWindow.duration.format(),
        },
      },
      {
        set: {
          description: 'Set timeWindow.type field',
          field: 'slo.timeWindow.type',
          value: slo.timeWindow.type,
        },
      },
      {
        set: {
          description: 'Set objective.target field',
          field: 'slo.objective.target',
          value: slo.objective.target,
        },
      },
      ...optionalObjectiveTimesliceProcessors,
      {
        set: {
          description: "if 'statusCode == 0', set status to NO_DATA",
          if: 'ctx.statusCode == 0',
          field: 'status',
          value: 'NO_DATA',
        },
      },
      {
        set: {
          description: "if 'statusCode == 1', set statusLabel to VIOLATED",
          if: 'ctx.statusCode == 1',
          field: 'status',
          value: 'VIOLATED',
        },
      },
      {
        set: {
          description: "if 'statusCode == 2', set status to DEGRADING",
          if: 'ctx.statusCode == 2',
          field: 'status',
          value: 'DEGRADING',
        },
      },
      {
        set: {
          description: "if 'statusCode == 4', set status to HEALTHY",
          if: 'ctx.statusCode == 4',
          field: 'status',
          value: 'HEALTHY',
        },
      },
      {
        set: {
          field: 'summaryUpdatedAt',
          value: '{{{_ingest.timestamp}}}',
        },
      },
      {
        set: {
          field: 'spaceId',
          value: spaceId,
        },
      },
      {
        set: {
          field: 'slo.indicator.params',
          value: slo.indicator.params,
          ignore_failure: true,
        },
      },
      {
        set: {
          field: 'slo.createdAt',
          value: slo.createdAt,
        },
      },
      {
        set: {
          field: 'slo.updatedAt',
          value: slo.updatedAt,
        },
      },
      {
        set: {
          field: 'kibanaUrl',
          value: basePath.publicBaseUrl ?? '',
          ignore_failure: true,
        },
      },
    ],
    _meta: {
      description: `Ingest pipeline for SLO summary data [id: ${slo.id}, revision: ${slo.revision}]`,
      version: SLO_RESOURCES_VERSION,
      managed: true,
      managed_by: 'observability',
    },
  };
};
