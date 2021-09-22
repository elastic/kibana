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
import { useAppUrl } from '../../../../../../../common/lib/kibana';

const LinkLabel = styled.span`
  display: inline-block;
  padding-right: ${(props) => props.theme.eui.paddingSizes.s};
`;

type ComponentProps = LinkToAppProps & {
  size: 'm' | 'l';
};

export const LinkWithIcon: FC<ComponentProps> = memo(({ children, ...props }) => {
  return (
    <LinkToApp {...props}>
      <LinkLabel size={props.size}>{children}</LinkLabel>
      <EuiIcon type={props.size === 'm' ? 'arrowRight' : 'popout'} />
    </LinkToApp>
  );
});

LinkWithIcon.displayName = 'LinkWithIcon';

export const ShowLink = memo(() => {
  const { getAppUrl } = useAppUrl();
  return (
    <LinkWithIcon href={getAppUrl({ appId: 'one', path: '/one' })} size="l">
      {'hello'}
    </LinkWithIcon>
  );
});
ShowLink.displayName = 'hello';
