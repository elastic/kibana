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
import { getAlertingCapabilities } from '../../hooks/get_alerting_capabilities';

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
  const { canReadAlerts } = getAlertingCapabilities(core.application.capabilities);
  return useMemo(() => {
    if (!canReadAlerts) return undefined;
    const base = core.http.basePath.prepend(observabilityPaths.alerts);
    // ENVIRONMENT_NOT_DEFINED must be checked before isEnvironmentDefined: the sentinel value
    // satisfies isEnvironmentDefined and would produce a plain field match instead of the
    // compound clause that also covers documents where service.environment is absent.
    const envKuery =
      environment === ENVIRONMENT_NOT_DEFINED.value
        ? `(${SERVICE_ENVIRONMENT}: "${ENVIRONMENT_NOT_DEFINED.value}" OR NOT ${SERVICE_ENVIRONMENT}: *)`
        : isEnvironmentDefined(environment)
        ? `${SERVICE_ENVIRONMENT}: "${escapeQuotes(environment)}"`
        : null;
    const kuery = [`${SERVICE_NAME}: "${escapeQuotes(serviceName)}"`, envKuery]
      .filter(Boolean)
      .join(' AND ');
    return `${base}?_a=${rison.encode({ kuery, rangeFrom, rangeTo })}`;
  }, [canReadAlerts, core.http.basePath, environment, serviceName, rangeFrom, rangeTo]);
}
