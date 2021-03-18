/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBetaBadge, EuiBadge, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';

import { BadgeOptions, TitleProp } from './types';

const StyledEuiBetaBadge = styled(EuiBetaBadge)`
  vertical-align: middle;
`;

StyledEuiBetaBadge.displayName = 'StyledEuiBetaBadge';

const Badge = (styled(EuiBadge)`
  letter-spacing: 0;
` as unknown) as typeof EuiBadge;
Badge.displayName = 'Badge';

interface Props {
  badgeOptions?: BadgeOptions;
  title: TitleProp;
}

const TitleComponent: React.FC<Props> = ({ title, badgeOptions }) => (
  <EuiTitle size="l">
    <h1 data-test-subj="header-page-title">
      {title}
      {badgeOptions && (
        <>
          {' '}
          {badgeOptions.beta ? (
            <StyledEuiBetaBadge
              label={badgeOptions.text}
              tooltipContent={badgeOptions.tooltip}
              tooltipPosition="bottom"
            />
          ) : (
            <Badge color="hollow" title="">
              {badgeOptions.text}
            </Badge>
          )}
        </>
      )}
    </h1>
  </EuiTitle>
);

export const Title = React.memo(TitleComponent);
