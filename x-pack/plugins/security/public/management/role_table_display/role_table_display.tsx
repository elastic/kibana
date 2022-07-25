/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiLink, EuiToolTip } from '@elastic/eui';
import React from 'react';

import type { ApplicationStart } from '@kbn/core/public';

import type { Role } from '../../../common/model';
import { getExtendedRoleDeprecationNotice, isRoleDeprecated } from '../../../common/model';

interface Props {
  role: Role | string;
  navigateToApp: ApplicationStart['navigateToApp'];
}

export const RoleTableDisplay = ({ role, navigateToApp }: Props) => {
  let content;
  let path: string;
  if (typeof role === 'string') {
    content = <div>{role}</div>;
    path = `security/roles/edit/${encodeURIComponent(role)}`;
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
    path = `security/roles/edit/${encodeURIComponent(role.name)}`;
  } else {
    content = <div>{role.name}</div>;
    path = `security/roles/edit/${encodeURIComponent(role.name)}`;
  }

  return <EuiLink onClick={() => navigateToApp('management', { path })}>{content}</EuiLink>;
};
