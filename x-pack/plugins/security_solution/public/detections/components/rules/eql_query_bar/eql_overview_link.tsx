/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import { EuiLink, EuiText } from '@elastic/eui';
import { EQL_OVERVIEW_LINK_TEXT } from './translations';

const EQL_OVERVIEW_URL = 'https://eql.readthedocs.io/en/latest/query-guide/index.html';

const InlineText = styled(EuiText)`
  display: inline-block;
`;

export const EqlOverviewLink = () => (
  <EuiLink external href={EQL_OVERVIEW_URL} target="_blank">
    <InlineText size="xs">{EQL_OVERVIEW_LINK_TEXT}</InlineText>
  </EuiLink>
);
