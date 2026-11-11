/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

function formatRateValue(perMinute: number): { value: string; perHour: boolean } {
  if (perMinute < 1) {
    const perHour = perMinute * 60;
    const rounded = perHour >= 10 ? Math.round(perHour) : Math.round(perHour * 10) / 10;
    return {
      value: rounded >= 10 ? String(Math.round(rounded)) : rounded.toFixed(1),
      perHour: true,
    };
  }

  // Round first, then pick the unit — so 9.96 → 10/m and 999.6 → 1.0k/m.
  const rounded = perMinute < 10 ? Math.round(perMinute * 10) / 10 : Math.round(perMinute);
  if (rounded >= 1000) {
    const k = Math.round((rounded / 1000) * 10) / 10;
    return { value: `${k >= 10 ? Math.round(k) : k.toFixed(1)}k`, perHour: false };
  }
  return {
    value: rounded >= 10 ? String(Math.round(rounded)) : rounded.toFixed(1),
    perHour: false,
  };
}

/**
 * Requests, short enough for the centre of a node: 412/m, 1.2k/m, or per hour below one a
 * minute (12/h), so low traffic doesn't read as zero.
 */
export function formatCompactRate(perMinute?: number): string | undefined {
  if (perMinute === undefined) {
    return undefined;
  }
  if (perMinute <= 0) {
    return '0';
  }
  const { value, perHour } = formatRateValue(perMinute);
  return perHour
    ? i18n.translate('xpack.apm.serviceMap.node.compactRatePerHour', {
        defaultMessage: '{value}/h',
        values: { value },
      })
    : i18n.translate('xpack.apm.serviceMap.node.compactRate', {
        defaultMessage: '{value}/m',
        values: { value },
      });
}

/**
 * Same rate as {@link formatCompactRate}, spelled out for screen readers ("14 requests per minute").
 */
export function describeCompactRate(perMinute?: number): string | undefined {
  if (perMinute === undefined) {
    return undefined;
  }
  if (perMinute <= 0) {
    return i18n.translate('xpack.apm.serviceMap.node.noRequestsDescribed', {
      defaultMessage: '0 requests per minute',
    });
  }
  const { value, perHour } = formatRateValue(perMinute);
  return perHour
    ? i18n.translate('xpack.apm.serviceMap.node.requestsPerHourDescribed', {
        defaultMessage: '{value} requests per hour',
        values: { value },
      })
    : i18n.translate('xpack.apm.serviceMap.node.requestsPerMinuteDescribed', {
        defaultMessage: '{value} requests per minute',
        values: { value },
      });
}
