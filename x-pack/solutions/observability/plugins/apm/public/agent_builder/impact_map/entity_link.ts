/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ImpactEntityLinkResolver } from '@kbn/agentic-investigations-plugin/public';
import type { getApmInternalServices } from '../../plugin';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';

type CallApmApi = NonNullable<ReturnType<typeof getApmInternalServices>>['callApmApi'];

const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

const OPEN_IN_APM = i18n.translate('xpack.apm.impactMap.openInApm', {
  defaultMessage: 'Open in APM',
});

/**
 * Finds a service entity in APM: it has to have reported an agent in the last week. Other kinds
 * of entity, and services APM has never seen, get no link.
 */
export const createApmEntityLinkResolver =
  ({
    prependBasePath,
    getCallApmApi,
  }: {
    prependBasePath: (path: string) => string;
    /** Read per call: the client is published when APM starts, after this is registered. */
    getCallApmApi: () => CallApmApi | undefined;
  }): ImpactEntityLinkResolver =>
  async ({ kind, label, metadata }) => {
    const callApmApi = getCallApmApi();
    if (kind !== 'service' || !callApmApi) {
      return undefined;
    }
    const serviceName = metadata?.find(({ key }) => key === 'service.name')?.value || label;
    const end = new Date();
    const { agentName } = await callApmApi('GET /internal/apm/services/{serviceName}/agent', {
      params: {
        path: { serviceName },
        query: {
          environment: ENVIRONMENT_ALL.value,
          start: new Date(end.getTime() - LOOKBACK_MS).toISOString(),
          end: end.toISOString(),
        },
      },
    });
    return agentName
      ? {
          href: prependBasePath(`/app/apm/services/${encodeURIComponent(serviceName)}/overview`),
          label: OPEN_IN_APM,
        }
      : undefined;
  };
