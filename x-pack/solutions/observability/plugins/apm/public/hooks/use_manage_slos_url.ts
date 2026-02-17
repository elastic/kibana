/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { Filter } from '@kbn/es-query';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { SloListLocatorParams } from '@kbn/deeplinks-observability';
import { sloListLocatorID } from '@kbn/deeplinks-observability';
import { APM_SLO_INDICATOR_TYPES } from '../../common/slo_indicator_types';
import { ENVIRONMENT_ALL } from '../../common/environment_filter_values';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';
import { useApmParams } from './use_apm_params';
import { useServiceName } from './use_service_name';

interface ManageSlosUrlParams {
  serviceName?: string;
  environment?: string;
}

export function getManageSlosUrl(
  sloListLocator: LocatorPublic<SloListLocatorParams> | undefined,
  params?: ManageSlosUrlParams
): string | undefined {
  if (!sloListLocator) return undefined;

  const filters: Filter[] = [
    {
      meta: {
        alias: null,
        disabled: false,
        key: 'slo.indicator.type',
        negate: false,
        params: [...APM_SLO_INDICATOR_TYPES],
        type: 'phrases',
      },
      query: {
        bool: {
          minimum_should_match: 1,
          should: APM_SLO_INDICATOR_TYPES.map((type) => ({
            match_phrase: { 'slo.indicator.type': type },
          })),
        },
      },
    },
  ];

  if (params?.serviceName) {
    filters.push({
      meta: {
        alias: null,
        disabled: false,
        key: 'service.name',
        negate: false,
        params: { query: params.serviceName },
        type: 'phrase',
      },
      query: {
        match_phrase: { 'service.name': params.serviceName },
      },
    });
  }

  if (params?.environment && params.environment !== ENVIRONMENT_ALL.value) {
    filters.push({
      meta: {
        alias: null,
        disabled: false,
        key: 'service.environment',
        negate: false,
        params: { query: params.environment },
        type: 'phrase',
      },
      query: {
        match_phrase: { 'service.environment': params.environment },
      },
    });
  }

  return sloListLocator.getRedirectUrl({ filters });
}

export function useManageSlosUrl(overrides?: ManageSlosUrlParams): string | undefined {
  const { share } = useApmPluginContext();
  const sloListLocator = share.url.locators.get<SloListLocatorParams>(sloListLocatorID);

  const routeServiceName = useServiceName();
  const { query } = useApmParams('/*');
  const routeEnvironment = 'environment' in query ? query.environment : undefined;

  const serviceName = overrides?.serviceName ?? routeServiceName;
  const environment = overrides?.environment ?? routeEnvironment;

  return useMemo(
    () => getManageSlosUrl(sloListLocator, { serviceName, environment }),
    [sloListLocator, serviceName, environment]
  );
}
