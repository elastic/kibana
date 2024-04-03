/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { formatErrors } from '@kbn/securitysolution-io-ts-utils';
import { Indicator, sloDefinitionSchema } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import { isLeft } from 'fp-ts/lib/Either';
import { SLODefinition } from '../../domain/models';
import { EsSummaryDocument } from '../summary_transform_generator/helpers/create_temp_summary';

export function fromRemoteSummaryDocumentToSloDefinition(
  summaryDoc: EsSummaryDocument,
  logger: Logger
): SLODefinition | undefined {
  const res = sloDefinitionSchema.decode({
    id: summaryDoc.slo.id,
    name: summaryDoc.slo.name,
    description: summaryDoc.slo.description,
    indicator: {
      type: summaryDoc.slo.indicator.type,
      params: getIndicatorParams(logger, summaryDoc),
    },
    timeWindow: summaryDoc.slo.timeWindow,
    budgetingMethod: summaryDoc.slo.budgetingMethod,
    objective: {
      target: summaryDoc.slo.objective.target,
      timesliceTarget: summaryDoc.slo.objective.timesliceTarget ?? undefined,
      timesliceWindow: summaryDoc.slo.objective.timesliceWindow ?? undefined,
    },
    settings: { syncDelay: '1m', frequency: '1m' },
    revision: summaryDoc.slo.revision,
    enabled: true,
    tags: summaryDoc.slo.tags,
    createdAt: summaryDoc.slo.createdAt ?? '2024-01-01T00:00:00.000Z',
    updatedAt: summaryDoc.slo.updatedAt ?? '2024-01-01T00:00:00.000Z',
    groupBy: summaryDoc.slo.groupBy,
    version: 1,
  });

  if (isLeft(res)) {
    const errors = formatErrors(res.left);
    logger.error(`Invalid remote stored summary SLO with id [${summaryDoc.slo.id}]`);
    logger.error(errors.join('|'));

    return undefined;
  }

  return res.right;
}

function getIndicatorParams(logger: Logger, summaryDoc: EsSummaryDocument): Indicator['params'] {
  const stringifiedParams = summaryDoc.slo.indicator.params;
  if (typeof stringifiedParams === 'string') {
    try {
      return JSON.parse(stringifiedParams);
    } catch (e) {
      logger.error(
        `Invalid remote stored summary SLO with id [${summaryDoc.slo.id}]. Error parsing indicator params. Falling back on dummy indicator params.`
      );
      logger.error(e);
    }
  }

  return getDummyIndicatorParams(summaryDoc);
}

function getDummyIndicatorParams(summaryDoc: EsSummaryDocument) {
  let params: Indicator['params'] | undefined;
  switch (summaryDoc.slo.indicator.type) {
    case 'sli.kql.custom':
      params = {
        index: '',
        good: '',
        total: '',
        timestampField: '',
      };
      break;
    case 'sli.apm.transactionDuration':
      params = {
        environment: '',
        service: '',
        transactionType: '',
        transactionName: '',
        threshold: 0,
        index: '',
      };
      break;
    case 'sli.apm.transactionErrorRate':
      params = {
        environment: '',
        service: '',
        transactionType: '',
        transactionName: '',
        index: '',
      };
      break;
    case 'sli.metric.custom':
      params = {
        index: '',
        good: '',
        total: '',
        timestampField: '',
      };
      break;
    case 'sli.metric.timeslice':
      params = {
        index: '',
        metric: {
          metrics: [],
          equation: '',
          threshold: 0,
          comparator: 'GT',
        },
        timestampField: '',
      };
      break;
    case 'sli.histogram.custom':
      params = {
        index: '',
        timestampField: '',
        good: '',
        total: '',
      };
      break;
    case 'sli.synthetics.availability':
      params = {
        projects: [],
        tags: [],
        monitorIds: [
          {
            value: '*',
            label: 'All',
          },
        ],
        index: 'synthetics-*',
        filter: '',
      };
      break;
    default:
      assertNever(summaryDoc.slo.indicator.type);
  }

  return params;
}
