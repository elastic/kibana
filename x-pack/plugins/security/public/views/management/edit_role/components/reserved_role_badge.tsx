/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';
import { Role } from '../../../../../common/model/role';
import { isReservedRole } from '../../../../lib/role';

interface Props {
  role: Role;
}

export const ReservedRoleBadgeUI = (props: Props) => {
  const { role, intl } = props;

  if (isReservedRole(role)) {
    return (
      <EuiToolTip
        content={intl.formatMessage({
          id:
            'xpack.security.views.management.editRoles.components.reversedRoleBadget.reversedRolesTitle',
          defaultMessage: 'Reserved roles are built-in and cannot be removed or modified.',
        })}
      >
        <EuiIcon style={{ verticalAlign: 'super' }} type={'lock'} />
      </EuiToolTip>
    );
  }
  return null;
};

export const ReservedRoleBadge = injectI18n(ReservedRoleBadgeUI);
