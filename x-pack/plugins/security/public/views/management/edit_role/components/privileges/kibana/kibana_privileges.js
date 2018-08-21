/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { CollapsiblePanel } from '../../collapsible_panel';
import { SimplePrivilegeForm } from './simple_privilege_form';
import { SpaceAwarePrivilegeForm } from './space_aware_privilege_form';

export class KibanaPrivileges extends Component {
  static propTypes = {
    role: PropTypes.object.isRequired,
    spacesEnabled: PropTypes.bool.isRequired,
    spaces: PropTypes.array,
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
      spacesEnabled,
      spaces = [],
      onChange,
      editable,
    } = this.props;

    if (spacesEnabled) {
      return (
        <SpaceAwarePrivilegeForm
          kibanaAppPrivileges={kibanaAppPrivileges}
          role={role}
          spaces={spaces}
          onChange={onChange}
          editable={editable}
        />
      );
    } else {
      return (
        <SimplePrivilegeForm
          kibanaAppPrivileges={kibanaAppPrivileges}
          role={role}
          onChange={onChange}
          editable={editable}
        />
      );
    }
  }
}
