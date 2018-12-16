/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

const Text = styled.span`
  color: #999999;
`;

const BadgeHighlighted = styled(EuiBadge)`
  height: 20px;
  margin: 0 5px 0 12px;
  max-width: 70px;
  min-width: 70px;
`;

const BadgeOr = styled(EuiBadge)`
  height: 20px;
  margin: 0 5px 0 12px;
  max-width: 20px;
  min-width: 20px;
`;

const Hint = styled.div`
  display: flex;
  justify-content: center;
`;

const Flex = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  min-height: 100px;
  padding: 10px;
  justify-content: center;
  user-select: none;
`;

/**
 * Prompts the user to drop anything with a facet count into the data providers section.
 */
export const Empty = pure(() => (
  <Flex data-test-subj="empty">
    <Hint>
      <Text>Drop anything</Text>
      <BadgeHighlighted color="#d9d9d9">highlighted</BadgeHighlighted>
      <Text>here to build an</Text>
      <BadgeOr color="#d9d9d9">OR</BadgeOr>
      <Text>query</Text>
    </Hint>
  </Flex>
));
