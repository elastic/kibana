/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nProvider } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { UICapabilities } from 'ui/capabilities';
import { Space } from '../../../../../../../../spaces/common/model/space';
import { KibanaPrivilege } from '../../../../../../../common/model/kibana_privilege';
import { Role } from '../../../../../../../common/model/role';
import { RoleValidator } from '../../../lib/validate_role';
import { CollapsiblePanel } from '../../collapsible_panel';
import { SimplePrivilegeForm } from './simple_privilege_form';
import { SpaceAwarePrivilegeForm } from './space_aware_privilege_form';

interface Props {
  role: Role;
  spacesEnabled: boolean;
  spaces?: Space[];
  uiCapabilities: UICapabilities;
  editable: boolean;
  kibanaAppPrivileges: KibanaPrivilege[];
  onChange: (role: Role) => void;
  validator: RoleValidator;
}

export class KibanaPrivileges extends Component<Props, {}> {
  public render() {
    return (
      <I18nProvider>
        <CollapsiblePanel iconType={'logoKibana'} title={'Kibana'}>
          {this.getForm()}
        </CollapsiblePanel>
      </I18nProvider>
    );
  }

  public getForm = () => {
    const {
      kibanaAppPrivileges,
      role,
      spacesEnabled,
      spaces = [],
      uiCapabilities,
      onChange,
      editable,
      validator,
    } = this.props;

    if (spacesEnabled) {
      return (
        <SpaceAwarePrivilegeForm
          kibanaAppPrivileges={kibanaAppPrivileges}
          role={role}
          spaces={spaces}
          uiCapabilities={uiCapabilities}
          onChange={onChange}
          editable={editable}
          validator={validator}
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
  };
}
