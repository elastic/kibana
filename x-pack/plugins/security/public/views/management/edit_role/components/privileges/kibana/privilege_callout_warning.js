/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiCallOut
} from '@elastic/eui';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';

export const PrivilegeCalloutWarning = ({ basePrivilege, isReservedRole }) => {
  if (basePrivilege === 'all') {
    if (isReservedRole) {
      return (
        <EuiCallOut color="warning" iconType="iInCircle" title={'Cannot customize a reserved role\'s space privileges'}>
          <p>
            This role always grants full access to all spaces.
            To customize privileges for individual spaces, you must create a new role.
          </p>
        </EuiCallOut>
      );
    } else {
      return (
        <EuiCallOut color="warning" iconType="iInCircle" title={'Minimum privilege is too high to customize individual spaces'}>
          <p>
            Setting the minimum privilege to <strong>all</strong> grants full access to all spaces.
            To customize privileges for individual spaces,
            the minimum privilege must be either <strong>read</strong> or <strong>none</strong>.
          </p>
        </EuiCallOut>
      );
    }
  }

  if (basePrivilege === 'read') {
    if (isReservedRole) {
      return (
        <EuiCallOut color="warning" iconType="iInCircle" title={'Cannot customize a reserved role\'s space privileges'}>
          <p>
            This role always grants read access to all spaces.
            To customize privileges for individual spaces, you must create a new role.
          </p>
        </EuiCallOut>
      );
    } else {
      return (
        <EuiCallOut color="primary" iconType="iInCircle" title={'Lowest possible privilege is \'read\''} />
      );
    }
  }

  if (basePrivilege === NO_PRIVILEGE_VALUE && isReservedRole) {
    return (
      <EuiCallOut color="warning" iconType="iInCircle" title={'Cannot customize a reserved role\'s space privileges'}>
        <p>
          This role never grants access to any spaces within Kibana.
          To customize privileges for individual spaces, you must create a new role.
        </p>
      </EuiCallOut>
    );
  }

  return null;
};

PrivilegeCalloutWarning.propTypes = {
  basePrivilege: PropTypes.string.isRequired,
  isReservedRole: PropTypes.bool.isRequired,
};
