/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiCallOut
} from '@elastic/eui';

export const PrivilegeCalloutWarning = ({ basePrivilege, isReservedRole }) => {
  if (basePrivilege === 'all') {
    return (
      <EuiCallOut color="warning" iconType="iInCircle" title={'Hey, this is important!'}>
        <p>
          Setting the minimum privilege to <strong>all</strong> grants full access to all spaces.<br />
          {getCorrectiveActionText(basePrivilege, isReservedRole)}
        </p>
      </EuiCallOut>
    );
  }

  if (basePrivilege === 'read') {
    return (
      <EuiCallOut color="primary" iconType="iInCircle" title={'Hey, this is important!'} size={'s'}>
        <p>
          Setting the minimum privilege to <strong>read</strong> grants a minimum of read access to all spaces.<br />
          {getCorrectiveActionText(basePrivilege, isReservedRole)}
        </p>
      </EuiCallOut>
    );
  }

  return null;
};

function getCorrectiveActionText(basePrivilege, isReservedRole) {
  if (basePrivilege === 'all') {
    return isReservedRole
      ? (
        <Fragment>
          To customize privileges for individual spaces, create a new role,
        and set the minimum privilege to either <strong>read</strong> or <strong>none</strong>
        </Fragment>
      )
      : (
        <Fragment>
          To customize privileges for individual spaces, set the minimum privilege to either <strong>read</strong> or <strong>none</strong>
        </Fragment>
      );
  }
  if (basePrivilege === 'read') {
    return isReservedRole
      ? (
        <Fragment>
          To restrict access to individual spaces, create a new role,
          and set the minimum privilege to <strong>none</strong>
        </Fragment>
      )
      : (
        <Fragment>
          To restrict access to individual spaces, set the minimum privilege to <strong>none</strong>
        </Fragment>
      );
  }
}

PrivilegeCalloutWarning.propTypes = {
  basePrivilege: PropTypes.string.isRequired,
  isReservedRole: PropTypes.bool.isRequired,
};
