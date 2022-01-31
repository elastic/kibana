/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBetaBadge, EuiBadge, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';

import { DraggableArguments, BadgeOptions, TitleProp } from './types';
import { DefaultDraggable } from '../draggables';
import { TruncatableText } from '../truncatable_text';

const StyledEuiBetaBadge = styled(EuiBetaBadge)`
  vertical-align: middle;
`;

StyledEuiBetaBadge.displayName = 'StyledEuiBetaBadge';

const Badge = styled(EuiBadge)`
  letter-spacing: 0;
  margin-left: 10px;
`;
Badge.displayName = 'Badge';

const Header = styled.h1`
  display: grid;
  grid-gap: 12px;
  grid-auto-flow: column;
`;
Header.displayName = 'Header';

const TitleWrapper = styled.span`
  // Without  min-width: 0, as a flex child, it wouldn't shrink properly
  // and could overflow its parent.
  min-width: 0;
`;
TitleWrapper.displayName = 'TitleWrapper';

interface Props {
  badgeOptions?: BadgeOptions;
  title: TitleProp;
  draggableArguments?: DraggableArguments;
}

const TitleComponent: React.FC<Props> = ({ draggableArguments, title, badgeOptions }) => (
  <EuiTitle size="l">
    <Header data-test-subj="header-page-title">
      {!draggableArguments ? (
        <TitleWrapper>
          <TruncatableText tooltipContent={title}>{title}</TruncatableText>
        </TitleWrapper>
      ) : (
        <DefaultDraggable
          data-test-subj="header-page-draggable"
          id={`header-page-draggable-${draggableArguments.field}-${draggableArguments.value}`}
          field={draggableArguments.field}
          value={`${draggableArguments.value}`}
        />
      )}
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
            <Badge color={badgeOptions.color || 'hollow'} title="">
              {badgeOptions.text}
            </Badge>
          )}
        </>
      )}
    </Header>
  </EuiTitle>
);

export const Title = React.memo(TitleComponent);
