/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { escapeQuotes } from '@kbn/es-query';
import { observabilityPaths } from '@kbn/observability-plugin/common';
import rison from '@kbn/rison';
import { ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import {
  isEnvironmentDefined,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../../../common/environment_filter_values';
import { SERVICE_NAME, SERVICE_ENVIRONMENT } from '../../../../../../common/es_fields/apm';
import { getAlertingCapabilities } from '../../../../alerting/utils/get_alerting_capabilities';
import { useServiceFlyoutContext } from '../../service_flyout_context';

export function useAlertsHref(): string | undefined {
  const {
    deps: { core, alerting },
    service,
    filters: { environment, rangeFrom, rangeTo },
  } = useServiceFlyoutContext();

  const { canReadAlerts } = getAlertingCapabilities({ alerting }, core.application.capabilities);

  return useMemo(() => {
    if (!canReadAlerts) return undefined;
    const base = core.http.basePath.prepend(observabilityPaths.alerts);
    // ENVIRONMENT_NOT_DEFINED must be checked before isEnvironmentDefined: the sentinel value
    // satisfies isEnvironmentDefined and would produce a plain field match instead of the
    // compound clause that also covers documents where service.environment is absent.
    const envKuery =
      environment === ENVIRONMENT_NOT_DEFINED.value
        ? `(${SERVICE_ENVIRONMENT}: "${ENVIRONMENT_NOT_DEFINED.value}" OR NOT ${SERVICE_ENVIRONMENT}: *)` // sentinel is a known safe literal, escaping not needed
        : isEnvironmentDefined(environment)
        ? `${SERVICE_ENVIRONMENT}: "${escapeQuotes(environment)}"`
        : null;
    const kuery = [`${SERVICE_NAME}: "${escapeQuotes(service.name)}"`, envKuery]
      .filter(Boolean)
      .join(' AND ');
    return `${base}?_a=${rison.encode({ kuery, status: ALERT_STATUS_ACTIVE, rangeFrom, rangeTo })}`;
  }, [canReadAlerts, core.http.basePath, environment, service.name, rangeFrom, rangeTo]);
}
