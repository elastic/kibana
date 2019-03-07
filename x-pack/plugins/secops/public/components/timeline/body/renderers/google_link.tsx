/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiLink } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

const LinkFlexItem = styled(EuiFlexItem)`
  margin-left: 6px;
`;

export const GoogleLink = pure(({ link, value }: { link: string; value: string }) => (
  <LinkFlexItem grow={false}>
    <EuiLink href={`https://www.google.com/search?q=${encodeURI(link)}`} target="_blank">
      {value}
    </EuiLink>
  </LinkFlexItem>
));
