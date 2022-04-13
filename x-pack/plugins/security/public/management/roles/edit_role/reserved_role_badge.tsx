/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiToolTip } from '@elastic/eui';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import type { Role } from '../../../../common/model';
import { isRoleReserved } from '../../../../common/model';

interface Props {
  role: Role;
}

export const ReservedRoleBadge = (props: Props) => {
  const { role } = props;

  if (isRoleReserved(role)) {
    return (
      <EuiToolTip
        data-test-subj="reservedRoleBadgeTooltip"
        content={
          <FormattedMessage
            id="xpack.security.management.editRole.reversedRoleBadge.reservedRolesCanNotBeModifiedTooltip"
            defaultMessage="Reserved roles are built-in and cannot be removed or modified."
          />
        }
      >
        <EuiIcon style={{ verticalAlign: 'super' }} type={'lock'} />
      </EuiToolTip>
    );
  }
  return null;
};
