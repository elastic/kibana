/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import {
  FAILURE_RATE_DANGER,
  FAILURE_RATE_WARNING,
  MIN_REQUESTS_FOR_FAILURE_RATE,
} from '../../../../common/service_map/constants';

export type FailureLevel = 'none' | 'low' | 'warning' | 'danger';

/**
 * How serious a share of failed requests is: none, low, a warning from 1%, a problem from 5%.
 * On fewer than 20 requests a rate says little (one failure of five reads 20%), so it stays low.
 */
export function getFailureLevel(failedRate?: number | null, requestCount?: number): FailureLevel {
  if (typeof failedRate !== 'number' || failedRate <= 0) {
    return 'none';
  }
  if (requestCount !== undefined && requestCount < MIN_REQUESTS_FOR_FAILURE_RATE) {
    return 'low';
  }
  if (failedRate >= FAILURE_RATE_DANGER) {
    return 'danger';
  }
  if (failedRate >= FAILURE_RATE_WARNING) {
    return 'warning';
  }
  return 'low';
}

/** Ring / fill colour for a failure level. */
export function useFailureColor(level: FailureLevel): string | undefined {
  const { euiTheme } = useEuiTheme();
  if (level === 'danger') {
    return euiTheme.colors.danger;
  }
  if (level === 'warning') {
    return euiTheme.colors.warning;
  }
  if (level === 'low') {
    return euiTheme.colors.borderBaseSubdued;
  }
  return undefined;
}

/** Text-safe colour for failure labels (xs text needs warningText / dangerText, not fill tokens). */
export function useFailureTextColor(level: FailureLevel): string | undefined {
  const { euiTheme } = useEuiTheme();
  if (level === 'danger') {
    return euiTheme.colors.textDanger;
  }
  if (level === 'warning') {
    return euiTheme.colors.textWarning;
  }
  return undefined;
}
