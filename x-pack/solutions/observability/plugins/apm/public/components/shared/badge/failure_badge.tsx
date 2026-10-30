/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EventOutcome } from '../../../../typings/es_schemas/raw/fields/event_outcome';

export interface FailureBadgeDescriptor {
  label: string;
  color: string;
  toolTipContent: string;
}

/** Resolves the failure badge's label, color, and tooltip, or `undefined` when the outcome is not a failure. */
export function getFailureBadgeDescriptor(
  outcome: EventOutcome | undefined,
  euiTheme: EuiThemeComputed
): FailureBadgeDescriptor | undefined {
  if (outcome !== 'failure') {
    return undefined;
  }

  return {
    label: i18n.translate('xpack.apm.failure_badge.label', {
      defaultMessage: 'failure',
    }),
    color: euiTheme.colors.danger,
    toolTipContent: i18n.translate('xpack.apm.failure_badge.tooltip', {
      defaultMessage: 'event.outcome = failure',
    }),
  };
}
