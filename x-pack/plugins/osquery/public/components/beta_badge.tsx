/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';

export const BetaBadgeRowWrapper = styled(EuiText)`
  display: flex;
  align-items: center;
`;

const Wrapper = styled.div`
  padding-left: ${({ theme }) => theme.eui.paddingSizes.s};
`;

const betaBadgeLabel = i18n.translate('xpack.osquery.common.tabBetaBadgeLabel', {
  defaultMessage: 'Beta',
});

const betaBadgeTooltipContent = i18n.translate('xpack.osquery.common.tabBetaBadgeTooltipContent', {
  defaultMessage:
    'This feature is under active development. Extra functionality is coming, and some functionality may change.',
});

const BetaBadgeComponent = () => (
  <Wrapper>
    <EuiBetaBadge label={betaBadgeLabel} tooltipContent={betaBadgeTooltipContent} />
  </Wrapper>
);

export const BetaBadge = React.memo(BetaBadgeComponent);
