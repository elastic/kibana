/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiBetaBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function ExperimentalBadge() {
  return (
    <EuiBetaBadge
      label={i18n.translate('xpack.observability.experimentalBadgeLabel', {
        defaultMessage: 'Technical preview',
      })}
      tooltipContent={i18n.translate('xpack.observability.experimentalBadgeDescription', {
        defaultMessage:
          'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
      })}
    />
  );
}

export function BetaBadge(
  badgeProps: Partial<Pick<EuiBetaBadgeProps, 'size' | 'iconType' | 'style'>>
) {
  return (
    <EuiBetaBadge
      label={i18n.translate('xpack.observability.betaBadgeLabel', {
        defaultMessage: 'Beta',
      })}
      tooltipContent={i18n.translate('xpack.observability.betaBadgeDescription', {
        defaultMessage: 'This functionality is in beta and is subject to change.',
      })}
      {...badgeProps}
    />
  );
}
