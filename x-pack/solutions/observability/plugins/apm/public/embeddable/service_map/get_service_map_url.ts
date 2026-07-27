/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode as encodeRison } from '@kbn/rison';
import type { CoreStart } from '@kbn/core/public';
import type { Environment } from '../../../common/environment_rt';

export interface ServiceMapUrlParams {
  rangeFrom: string;
  rangeTo: string;
  environment?: Environment;
  kuery?: string;
  serviceName?: string;
  serviceGroupId?: string;
  /**
   * Field-value pairs to pre-populate as filter bar pills.
   * Each `field` is used unescaped in a match_phrase query — only pass trusted
   * field names (e.g. TRANSACTION_NAME, TRANSACTION_TYPE constants).
   */
  filterPills?: Array<{ field: string; value: string }>;
}

/**
 * Builds the URL to the full APM service map page with the same context.
 * Used by the embeddable "View full service map" link.
 */
export function getServiceMapUrl(core: CoreStart, params: ServiceMapUrlParams): string {
  const { rangeFrom, rangeTo, environment, kuery, serviceName, serviceGroupId, filterPills } =
    params;
  const searchParams = new URLSearchParams();
  searchParams.set('rangeFrom', rangeFrom);
  searchParams.set('rangeTo', rangeTo);
  if (environment !== undefined && environment !== '') {
    searchParams.set('environment', environment);
  }
  if (kuery !== undefined && kuery !== '') {
    searchParams.set('kuery', kuery);
  }
  if (serviceGroupId !== undefined && serviceGroupId !== '') {
    searchParams.set('serviceGroup', serviceGroupId);
  }

  if (filterPills && filterPills.length > 0) {
    const filters = filterPills.map((pill) => ({
      meta: { key: pill.field, negate: false, disabled: false },
      query: { match_phrase: { [pill.field]: pill.value } },
    }));
    const appState = encodeRison({ filters });
    searchParams.set('_a', appState);
  }

  const queryString = searchParams.toString();
  const hashPath = serviceName
    ? `#/services/${encodeURIComponent(serviceName)}/service-map`
    : '#/service-map';
  const path = `${hashPath}?${queryString}`;
  return core.application.getUrlForApp('apm', { path });
}
