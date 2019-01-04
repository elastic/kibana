/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

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

const EmptyContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  min-height: 100px;
  user-select: none;
`;

const NoWrap = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-wrap: no-wrap;
`;

/**
 * Prompts the user to drop anything with a facet count into the data providers section.
 */
export const Empty = pure(() => (
  <EmptyContainer data-test-subj="empty">
    <NoWrap>
      <Text>Drop anything</Text>
      <BadgeHighlighted color="#d9d9d9">highlighted</BadgeHighlighted>
    </NoWrap>

    <NoWrap>
      <Text>here to build an</Text>
      <BadgeOr color="#d9d9d9">OR</BadgeOr>
      <Text>query</Text>
    </NoWrap>
  </EmptyContainer>
));
