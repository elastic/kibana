/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBetaBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const BetaBadge: React.FunctionComponent = () => (
  <EuiBetaBadge
    aria-label={betaBadgeLabel}
    label={betaBadgeLabel}
    tooltipContent={betaBadgeTooltipContent}
    className="eui-alignMiddle"
  />
);
const betaBadgeLabel = i18n.translate('xpack.infra.common.tabBetaBadgeLabel', {
  defaultMessage: 'Beta',
});

const betaBadgeTooltipContent = i18n.translate('xpack.infra.common.tabBetaBadgeTooltipContent', {
  defaultMessage:
    'This feature is under active development. Extra functionality is coming, and some functionality may change.',
});
