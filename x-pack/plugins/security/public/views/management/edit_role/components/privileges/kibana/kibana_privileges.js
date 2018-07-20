/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { CollapsiblePanel } from '../../collapsible_panel';
import { SpaceAwarePrivilegeForm } from './space_aware_privilege_form';

export class KibanaPrivileges extends Component {
  static propTypes = {
    role: PropTypes.object.isRequired,
    spaces: PropTypes.array,
    spacesEnabled: PropTypes.bool.isRequired,
    editable: PropTypes.bool.isRequired,
    kibanaAppPrivileges: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
  };

  render() {
    return (
      <CollapsiblePanel iconType={'logoKibana'} title={'Kibana'}>
        {this.getForm()}
      </CollapsiblePanel>
    );
  }

  getForm = () => {
    const {
      kibanaAppPrivileges,
      role,
      rbacApplication,
      spaces = [],
      onChange,
      editable,
    } = this.props;

    return (
      <SpaceAwarePrivilegeForm
        kibanaAppPrivileges={kibanaAppPrivileges}
        role={role}
        rbacApplication={rbacApplication}
        spaces={spaces}
        onChange={onChange}
        editable={editable}
      />
    );
  }
}
