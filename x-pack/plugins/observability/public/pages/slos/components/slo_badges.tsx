/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiLightVars } from '@kbn/ui-theme';

import type { SLO } from '../../../typings';
import { STATUS } from '../../../typings';

export interface SloBadgesProps {
  slo: SLO;
}

export function SloBadges({ slo }: SloBadgesProps) {
  return (
    <div>
      {slo.summary.status === STATUS.NoData && (
        <EuiBadge color={euiLightVars.euiColorDisabled}>
          {i18n.translate('xpack.observability.slos.slo.state.noData', {
            defaultMessage: 'No data',
          })}
        </EuiBadge>
      )}

      {slo.summary.status === STATUS.Healthy && (
        <EuiBadge color={euiLightVars.euiColorSuccess}>
          {i18n.translate('xpack.observability.slos.slo.state.healthy', {
            defaultMessage: 'Healthy',
          })}
        </EuiBadge>
      )}

      {slo.summary.status === STATUS.Degrading && (
        <EuiBadge color={euiLightVars.euiColorWarning}>
          {i18n.translate('xpack.observability.slos.slo.state.degrading', {
            defaultMessage: 'Degrading',
          })}
        </EuiBadge>
      )}

      {slo.summary.status === STATUS.Violated && (
        <EuiBadge color={euiLightVars.euiColorDanger}>
          {i18n.translate('xpack.observability.slos.slo.state.violated', {
            defaultMessage: 'Violated',
          })}
        </EuiBadge>
      )}
    </div>
  );
}
