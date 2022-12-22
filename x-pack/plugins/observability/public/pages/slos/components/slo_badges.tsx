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
import { isSloHealthy } from '../helpers/is_slo_healthy';
import { SLO } from '../../../typings';

export interface SloBadgesProps {
  slo: SLO;
}

export function SloBadges({ slo }: SloBadgesProps) {
  return (
    <>
      {isSloHealthy(slo) ? (
        <EuiBadge color={euiLightVars.euiColorSuccess}>
          {i18n.translate('xpack.observability.slos.slo.state.healthy', {
            defaultMessage: 'Healthy',
          })}
        </EuiBadge>
      ) : (
        <EuiBadge color={euiLightVars.euiColorDanger}>
          {i18n.translate('xpack.observability.slos.slo.state.violated', {
            defaultMessage: 'Violated',
          })}
        </EuiBadge>
      )}
    </>
  );
}
