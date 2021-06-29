/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import React, { FC, memo } from 'react';
import { EuiIcon } from '@elastic/eui';
import {
  LinkToApp,
  LinkToAppProps,
} from '../../../../../../../common/components/endpoint/link_to_app';

const LinkLabel = styled.span`
  display: inline-block;
  padding-right: ${(props) => props.theme.eui.paddingSizes.s};
`;

export const LinkWithIcon: FC<LinkToAppProps> = memo(({ children, ...props }) => {
  return (
    <LinkToApp {...props}>
      <LinkLabel>{children}</LinkLabel>
      <EuiIcon type="popout" />
    </LinkToApp>
  );
});

LinkWithIcon.displayName = 'LinkWithIcon';
