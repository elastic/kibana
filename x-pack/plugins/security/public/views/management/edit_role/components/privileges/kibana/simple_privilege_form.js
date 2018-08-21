/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { PrivilegeSelector } from './privilege_selector';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';
import {
  EuiDescribedFormGroup,
  EuiFormRow,
} from '@elastic/eui';
import { isReservedRole } from '../../../../../../lib/role';
import { copyRole } from '../../../lib/copy_role';

export class SimplePrivilegeForm extends Component {
  static propTypes = {
    kibanaAppPrivileges: PropTypes.array.isRequired,
    role: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    editable: PropTypes.bool.isRequired,
  }

  render() {
    const {
      kibanaAppPrivileges,
      role,
    } = this.props;

    const assignedPrivileges = role.kibana;
    const availablePrivileges = kibanaAppPrivileges.map(privilege => privilege.name);

    const kibanaPrivilege = assignedPrivileges.global.length > 0 ? assignedPrivileges.global[0] : NO_PRIVILEGE_VALUE;

    const description = (<p>Specifies the Kibana privilege for this role.</p>);

    return (
      <Fragment>
        <EuiDescribedFormGroup
          title={<h3>Kibana privileges</h3>}
          description={description}
        >
          <EuiFormRow
            hasEmptyLabelSpace
          >
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

  onKibanaPrivilegeChange = (privilege) => {
    const role = copyRole(this.props.role);

    // Remove base privilege value
    role.kibana.global = [];

    if (privilege !== NO_PRIVILEGE_VALUE) {
      role.kibana.global = [privilege];
    }

    this.props.onChange(role);
  }
}
