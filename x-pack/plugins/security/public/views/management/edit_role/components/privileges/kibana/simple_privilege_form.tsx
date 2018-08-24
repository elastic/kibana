/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFormRow,
} from '@elastic/eui';
import React, { Component, Fragment } from 'react';
import { KibanaApplicationPrivilege } from '../../../../../../../common/model/kibana_application_privilege';
import { KibanaPrivilege } from '../../../../../../../common/model/kibana_privilege';
import { Role } from '../../../../../../../common/model/role';
import { isReservedRole } from '../../../../../../lib/role';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';
import { copyRole } from '../../../lib/copy_role';
import { PrivilegeSelector } from './privilege_selector';

interface Props {
  kibanaAppPrivileges: KibanaApplicationPrivilege[];
  role: Role;
  onChange: (role: Role) => void;
  editable: boolean;
}

export class SimplePrivilegeForm extends Component<Props, {}> {
  public render() {
    const { kibanaAppPrivileges, role } = this.props;

    const assignedPrivileges = role.kibana;
    const availablePrivileges = kibanaAppPrivileges.map(privilege => privilege.name);

    const kibanaPrivilege: KibanaPrivilege =
      assignedPrivileges.global.length > 0
        ? (assignedPrivileges.global[0] as KibanaPrivilege)
        : NO_PRIVILEGE_VALUE;

    const description = <p>Specifies the Kibana privilege for this role.</p>;

    return (
      <Fragment>
        <EuiDescribedFormGroup title={<h3>Kibana privileges</h3>} description={description}>
          <EuiFormRow hasEmptyLabelSpace>
            <PrivilegeSelector
              data-test-subj={'kibanaPrivilege'}
              availablePrivileges={availablePrivileges}
              value={kibanaPrivilege}
              disabled={isReservedRole(role)}
              allowNone={true}
              onChange={this.onKibanaPrivilegeChange}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      </Fragment>
    );
  }

  public onKibanaPrivilegeChange = (privilege: KibanaPrivilege) => {
    const role = copyRole(this.props.role);

    // Remove base privilege value
    role.kibana.global = [];

    if (privilege !== NO_PRIVILEGE_VALUE) {
      role.kibana.global = [privilege];
    }

    this.props.onChange(role);
  };
}
