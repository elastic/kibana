/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { escapeQuotes } from '@kbn/es-query';
import { observabilityPaths } from '@kbn/observability-plugin/common';
import rison from '@kbn/rison';
import type { Environment } from '../../../../../../common/environment_rt';
import {
  isEnvironmentDefined,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../../../common/environment_filter_values';
import { SERVICE_NAME, SERVICE_ENVIRONMENT } from '../../../../../../common/es_fields/apm';

interface UseAlertsHrefParams {
  core: CoreStart;
  serviceName: string;
  environment: Environment;
  rangeFrom: string;
  rangeTo: string;
}

export function useAlertsHref({
  core,
  serviceName,
  environment,
  rangeFrom,
  rangeTo,
}: UseAlertsHrefParams): string | undefined {
  return useMemo(() => {
    const base = core.http.basePath.prepend(observabilityPaths.alerts);
    if (!base) return undefined;
    const envKuery =
      environment === ENVIRONMENT_NOT_DEFINED.value
        ? `(${SERVICE_ENVIRONMENT}: "${ENVIRONMENT_NOT_DEFINED.value}" OR NOT ${SERVICE_ENVIRONMENT}: *)`
        : isEnvironmentDefined(environment)
        ? `${SERVICE_ENVIRONMENT}: "${escapeQuotes(environment)}"`
        : null;
    const kuery = [`${SERVICE_NAME}: "${serviceName}"`, envKuery].filter(Boolean).join(' AND ');
    return `${base}?_a=${rison.encode({ kuery, rangeFrom, rangeTo, status: 'all' })}`;
  }, [core.http.basePath, environment, serviceName, rangeFrom, rangeTo]);
}
