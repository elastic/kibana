/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiText } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

const Text = styled(EuiText)`
  display: inline;
  padding-left: 5px;
  padding-right: 5px;
  color: #999999;
`;

const Flex = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
`;

/**
 * Prompts the user to drop anything with a facet count into the data providers section.
 */
export const Empty = pure(() => (
  <Flex data-test-subj="empty">
    <Text>Drop anything with a </Text>
    <EuiBadge color="primary">Facet</EuiBadge>
    <Text> count here</Text>
  </Flex>
));
