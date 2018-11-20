/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiIcon, EuiToolTip } from '@elastic/eui';
<<<<<<< HEAD
=======
import { FormattedMessage } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import { Role } from '../../../../../common/model/role';
import { isReservedRole } from '../../../../lib/role';

interface Props {
  role: Role;
}

export const ReservedRoleBadge = (props: Props) => {
  const { role } = props;

  if (isReservedRole(role)) {
    return (
<<<<<<< HEAD
      <EuiToolTip content={'Reserved roles are built-in and cannot be removed or modified.'}>
=======
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.security.management.editRoles.reversedRoleBadget.reversedRolesCanNotBeRemovedTooltip"
            defaultMessage="Reserved roles are built-in and cannot be removed or modified."
          />
        }
      >
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        <EuiIcon style={{ verticalAlign: 'super' }} type={'lock'} />
      </EuiToolTip>
    );
  }
  return null;
};
