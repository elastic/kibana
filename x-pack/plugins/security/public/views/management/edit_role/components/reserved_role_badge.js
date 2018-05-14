/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { isReservedRole } from '../lib/is_reserved_role';
import {
  EuiBadge,
  EuiToolTip,
  EuiFlexItem,
} from '@elastic/eui';


export const ReservedRoleBadge = (props) => {
  const {
    role
  } = props;

  if (isReservedRole(role)) {
    return (
      <EuiFlexItem grow={false}>
        <EuiToolTip content={'Reserved roles are built-in and cannot be removed or modified.'}>
          <EuiBadge iconType={'lock'}>Reserved Role</EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
    );
  }
  return null;
};

ReservedRoleBadge.propTypes = {
  role: PropTypes.object.isRequired
};
