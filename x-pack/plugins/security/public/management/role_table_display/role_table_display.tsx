/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLink, EuiToolTip, EuiIcon } from '@elastic/eui';
import { Role, isRoleDeprecated, getExtendedRoleDeprecationNotice } from '../../../common/model';
import { getEditRoleHref } from '../management_urls';

interface Props {
  role: Role | string;
}

export const RoleTableDisplay = ({ role }: Props) => {
  let content;
  let href;
  if (typeof role === 'string') {
    content = <div>{role}</div>;
    href = getEditRoleHref(role);
  } else if (isRoleDeprecated(role)) {
    content = (
      <EuiToolTip
        content={getExtendedRoleDeprecationNotice(role)}
        data-test-subj="roleDeprecationTooltip"
      >
        <div>
          {role.name} <EuiIcon type="alert" color="warning" size="s" className={'eui-alignTop'} />
        </div>
      </EuiToolTip>
    );
    href = getEditRoleHref(role.name);
  } else {
    content = <div>{role.name}</div>;
    href = getEditRoleHref(role.name);
  }
  return <EuiLink href={href}>{content}</EuiLink>;
};
