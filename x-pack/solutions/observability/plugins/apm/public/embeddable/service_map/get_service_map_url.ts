/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode as encodeRison } from '@kbn/rison';
import type { CoreStart } from '@kbn/core/public';
import { SERVICE_NAME } from '@kbn/apm-types';
import type { Environment } from '../../../common/environment_rt';

/** Controls API selections keyed by field name (e.g. `{ 'service.name': ['frontend'] }`). */
export type ServiceMapControlSelections = Record<string, string[]>;

export interface ServiceMapUrlParams {
  rangeFrom: string;
  rangeTo: string;
  environment?: Environment;
  kuery?: string;
  serviceName?: string;
  serviceGroupId?: string;
  /**
   * Additional Controls API selections to seed on the global map.
   * Merged with `serviceName` when both are provided.
   */
  controlSelections?: ServiceMapControlSelections;
  /**
   * Field-value pairs to pre-populate as filter bar pills (`_a.filters`).
   * Each `field` is used unescaped in a match_phrase query — only pass trusted
   * field names (e.g. TRANSACTION_NAME, TRANSACTION_TYPE constants).
   */
  filterPills?: Array<{ field: string; value: string }>;
}

/**
 * Fields that have a Controls API dropdown on the global service map.
 * These must not also appear as filter-bar pills — that produces the duplicate
 * "pill + Service name: Any" UX.
 */
const CONTROL_FIELDS = new Set([
  SERVICE_NAME,
  'service.environment',
  'cloud.region',
  'cloud.availability_zone',
]);

function mergeControlValue(
  selections: ServiceMapControlSelections,
  field: string,
  value: string
): void {
  const existing = selections[field] ?? [];
  if (!existing.includes(value)) {
    selections[field] = [...existing, value];
  }
}

/**
 * Builds query params for the global service map (`/service-map`).
 * Shared by `getServiceMapUrl` and focused-map route redirects.
 */
export function buildServiceMapSearchParams(params: ServiceMapUrlParams): URLSearchParams {
  const {
    rangeFrom,
    rangeTo,
    environment,
    kuery,
    serviceName,
    serviceGroupId,
    controlSelections: controlSelectionsParam,
    filterPills,
  } = params;
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

  const controlSelections: ServiceMapControlSelections = {
    ...(controlSelectionsParam ?? {}),
  };

  if (serviceName !== undefined && serviceName !== '') {
    mergeControlValue(controlSelections, SERVICE_NAME, serviceName);
  }

  const filterBarPills: Array<{ field: string; value: string }> = [];
  for (const pill of filterPills ?? []) {
    if (CONTROL_FIELDS.has(pill.field)) {
      mergeControlValue(controlSelections, pill.field, pill.value);
    } else {
      filterBarPills.push(pill);
    }
  }

  const appState: {
    filters?: Array<{
      meta: { key: string; negate: boolean; disabled: boolean };
      query: { match_phrase: Record<string, string> };
    }>;
    controlSelections?: ServiceMapControlSelections;
  } = {};

  if (filterBarPills.length > 0) {
    appState.filters = filterBarPills.map((pill) => ({
      meta: { key: pill.field, negate: false, disabled: false },
      query: { match_phrase: { [pill.field]: pill.value } },
    }));
  }

  const nonEmptyControlSelections = Object.fromEntries(
    Object.entries(controlSelections).filter(([, values]) => values.length > 0)
  );
  if (Object.keys(nonEmptyControlSelections).length > 0) {
    appState.controlSelections = nonEmptyControlSelections;
  }

  if (appState.filters !== undefined || appState.controlSelections !== undefined) {
    searchParams.set('_a', encodeRison(appState));
  }

  return searchParams;
}

/**
 * Builds the URL to the global APM service map with the same context.
 * Used by embeddable / contextual "Explore in Service map" links.
 * Always targets `#/service-map` (not the per-service focused map route).
 */
export function getServiceMapUrl(core: CoreStart, params: ServiceMapUrlParams): string {
  const searchParams = buildServiceMapSearchParams(params);
  const path = `#/service-map?${searchParams.toString()}`;
  return core.application.getUrlForApp('apm', { path });
}
