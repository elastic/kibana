/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Indicator, sloSchema } from '@kbn/slo-schema';
import { isLeft } from 'fp-ts/lib/Either';
import { Logger } from '@kbn/logging';
import { formatErrors } from '@kbn/securitysolution-io-ts-utils';
import { SLO } from '../../domain/models';
import { EsSummaryDocument } from '../summary_transform_generator/helpers/create_temp_summary';

export function fromSummaryDocumentToSlo(
  summaryDoc: EsSummaryDocument,
  logger: Logger
): SLO | undefined {
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
  }
  const res = sloSchema.decode({
    ...summaryDoc.slo,
    indicator: {
      type: summaryDoc.slo.indicator.type,
      params,
    },
    kibanaUrl: summaryDoc.kibanaUrl,
    settings: { syncDelay: '1m', frequency: '1m' },
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    version: 1,
  });

  if (isLeft(res)) {
    const errors = formatErrors(res.left);
    logger.error(`Invalid remote stored SLO with id [${summaryDoc.slo.id}]`);

    logger.error(errors.join('|'));
    return undefined;
  } else {
    const formattedSlo = res.right;
    if ('params' in summaryDoc.slo.indicator) {
      const rawParams = summaryDoc.slo.indicator.params;
      if (typeof rawParams === 'string') {
        try {
          formattedSlo.indicator.params = JSON.parse(rawParams);
        } catch (e) {
          logger.error(
            `Invalid remote stored SLO with id [${summaryDoc.slo.id}]. Error parsing params`
          );
          logger.error(e);
        }
      } else {
        // @ts-expect-error
        formattedSlo.indicator.params = rawParams;
      }
      return formattedSlo;
    } else {
      // @ts-expect-error
      formattedSlo.indicator.params = {};
      return formattedSlo;
    }
  }
}

export const getNameOfRemoteCluster = (index: string) => {
  if (index.includes(':')) {
    return index.split(':')?.[0];
  }
};
