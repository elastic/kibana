/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge } from '@elastic/eui';
import type { IconType, ToolTipPositions } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  iconType?: IconType;
  tooltipPosition?: ToolTipPositions;
}
export const ExperimentalBadge = ({ iconType, tooltipPosition }: Props) => (
  <EuiBetaBadge
    label={i18n.translate('xpack.infra.hostsViewPage.experimentalBadgeLabel', {
      defaultMessage: 'Technical preview',
    })}
    tooltipContent={i18n.translate('xpack.infra.hostsViewPage.experimentalBadgeDescription', {
      defaultMessage:
        'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will take a best effort approach to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
    })}
    iconType={iconType}
    tooltipPosition={tooltipPosition}
  />
);
