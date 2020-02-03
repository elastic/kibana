/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLink, EuiToolTip, EuiIcon, EuiLinkProps } from '@elastic/eui';
import { Role, isRoleDeprecated, getExtendedRoleDeprecationNotice } from '../../../common/model';
import { getEditRoleHref } from '../management_urls';

interface Props {
  role: Role | string;
}

export const RoleTableDisplay = ({ role }: Props) => {
  let content;
  let href;
  let color: EuiLinkProps['color'] = 'primary';
  if (typeof role === 'string') {
    content = <span>{role}</span>;
    href = getEditRoleHref(role);
  } else if (isRoleDeprecated(role)) {
    color = 'warning';
    content = (
      <EuiToolTip content={getExtendedRoleDeprecationNotice(role)}>
        <span>
          {role.name} <EuiIcon type="alert" color="warning" size="s" className={'eui-alignTop'} />
        </span>
      </EuiToolTip>
    );
    href = getEditRoleHref(role.name);
  } else {
    content = <span>{role.name}</span>;
    href = getEditRoleHref(role.name);
  }
  return (
    <EuiLink href={href} color={color}>
      {content}
    </EuiLink>
  );
};
