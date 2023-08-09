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
  tooltipContent?: string;
}
export const BetaBadge = ({ iconType, tooltipPosition, tooltipContent }: Props) => (
  <EuiBetaBadge
    label={i18n.translate('xpack.infra.common.tabBetaBadgeLabel', {
      defaultMessage: 'Beta',
    })}
    tooltipContent={tooltipContent}
    iconType={iconType}
    tooltipPosition={tooltipPosition}
    data-test-id="infra-beta-badge"
  />
);
