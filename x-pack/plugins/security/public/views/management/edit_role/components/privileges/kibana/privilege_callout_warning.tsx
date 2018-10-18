/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiCallOut } from '@elastic/eui';
import React, { Component } from 'react';
import { KibanaPrivilege } from '../../../../../../../common/model/kibana_privilege';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';

interface Props {
  basePrivilege: KibanaPrivilege;
  isReservedRole: boolean;
}

interface State {
  showImpactedSpaces: boolean;
}

export class PrivilegeCalloutWarning extends Component<Props, State> {
  public state = {
    showImpactedSpaces: false,
  };

  public render() {
    const { basePrivilege, isReservedRole } = this.props;

    let callout = null;

    if (basePrivilege === 'all') {
      if (isReservedRole) {
        callout = (
          <EuiCallOut
            color="warning"
            iconType="iInCircle"
            title={"Cannot customize a reserved role's space privileges"}
          >
            <p>
              This role always grants full access to all spaces. To customize privileges for
              individual spaces, you must create a new role.
            </p>
          </EuiCallOut>
        );
      } else {
        callout = (
          <EuiCallOut
            color="warning"
            iconType="iInCircle"
            title={'Minimum privilege is too high to customize individual spaces'}
          >
            <p>
              Setting the minimum privilege to <strong>all</strong> grants full access to all
              spaces. To customize privileges for individual spaces, the minimum privilege must be
              either <strong>read</strong> or <strong>none</strong>.
            </p>
          </EuiCallOut>
        );
      }
    }

    if (basePrivilege === 'read') {
      if (isReservedRole) {
        callout = (
          <EuiCallOut
            color="warning"
            iconType="iInCircle"
            title={"Cannot customize a reserved role's space privileges"}
          >
            <p>
              This role always grants read access to all spaces. To customize privileges for
              individual spaces, you must create a new role.
            </p>
          </EuiCallOut>
        );
      } else {
        callout = (
          <EuiCallOut
            color="primary"
            iconType="iInCircle"
            title={
              <span>
                The minimal possible privilege is <strong>read</strong>.
              </span>
            }
          />
        );
      }
    }

    if (basePrivilege === NO_PRIVILEGE_VALUE) {
      if (isReservedRole) {
        callout = (
          <EuiCallOut
            color="warning"
            iconType="iInCircle"
            title={"Cannot customize a reserved role's space privileges"}
          >
            <p>
              This role never grants access to any spaces within Kibana. To customize privileges for
              individual spaces, you must create a new role.
            </p>
          </EuiCallOut>
        );
      } else {
        callout = (
          <EuiCallOut color="warning" iconType="iInCircle" title={'No access to Kibana'}>
            <p>This role will have no access to Kibana.</p>
          </EuiCallOut>
        );
      }
    }

    return callout;
  }
}
