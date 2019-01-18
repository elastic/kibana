/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import * as i18n from './translations';

const Text = styled.div`
  color: #999999;
  overflow: hidden;
  padding: 3px;
  white-space: nowrap;
`;

const BadgeHighlighted = styled(EuiBadge)`
  height: 20px;
  margin: 0 5px 0 5px;
  max-width: 70px;
  min-width: 70px;
`;

const BadgeOr = styled(EuiBadge)`
  height: 20px;
  margin: 0 5px 0 5px;
  max-width: 20px;
  min-width: 20px;
`;

const EmptyContainer = styled.div<{ shareSpace: boolean }>`
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  min-height: 100px;
  user-select: none;
  flex: 1;
  align-content: center;
  ${({ shareSpace }) => (shareSpace ? `padding-top: 25px` : '')};
`;

const NoWrap = styled.div`
  margin: 6px;
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-wrap: no-wrap;
`;

interface OwnProps {
  shareSpace?: boolean;
}

/**
 * Prompts the user to drop anything with a facet count into the data providers section.
 */
export const Empty = pure<OwnProps>(({ shareSpace = false }) => (
  <EmptyContainer className="timeline-drop-area" shareSpace={shareSpace} data-test-subj="empty">
    <NoWrap>
      <Text>{i18n.DROP_ANYTHING}</Text>
      <BadgeHighlighted color="#d9d9d9">{i18n.HIGHLIGHTED}</BadgeHighlighted>
    </NoWrap>

    <NoWrap>
      <Text>{i18n.HERE_TO_BUILD_AN}</Text>
      <BadgeOr color="#d9d9d9">{i18n.OR.toLocaleUpperCase()}</BadgeOr>
      <Text>{i18n.QUERY}</Text>
    </NoWrap>
  </EmptyContainer>
));
