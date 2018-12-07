/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nProvider, InjectedIntl } from '@kbn/i18n/react';
import { getEffectivePrivileges } from 'plugins/security/lib/get_effective_privileges';
import React, { Component } from 'react';
import { UICapabilities } from 'ui/capabilities';
import { PrivilegeDefinition } from 'x-pack/plugins/security/common/model/privileges/privilege_definition';
import { Feature } from 'x-pack/plugins/xpack_main/types';
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
  features: Feature[];
  editable: boolean;
  privilegeDefinition: PrivilegeDefinition;
  kibanaAppPrivileges: KibanaPrivilege[];
  onChange: (role: Role) => void;
  validator: RoleValidator;
  intl: InjectedIntl;
}

export class KibanaPrivileges extends Component<Props, {}> {
  public render() {
    return (
      <CollapsiblePanel iconType={'logoKibana'} title={'Kibana'}>
        {this.getForm()}
      </CollapsiblePanel>
    );
  }

  public getForm = () => {
    const {
      kibanaAppPrivileges,
      privilegeDefinition,
      role,
      spacesEnabled,
      spaces = [],
      uiCapabilities,
      onChange,
      editable,
      validator,
      features,
    } = this.props;

    if (spacesEnabled) {
      return (
        <SpaceAwarePrivilegeForm
          privilegeDefinition={privilegeDefinition}
          kibanaAppPrivileges={kibanaAppPrivileges}
          role={role}
          effectivePrivileges={getEffectivePrivileges(privilegeDefinition, role)}
          spaces={spaces}
          uiCapabilities={uiCapabilities}
          features={features}
          onChange={onChange}
          editable={editable}
          validator={validator}
        />
      );
    } else {
      return (
        <SimplePrivilegeForm
          privilegeDefinition={privilegeDefinition}
          kibanaAppPrivileges={kibanaAppPrivileges}
          features={features}
          role={role}
          effectivePrivileges={getEffectivePrivileges(privilegeDefinition, role)}
          onChange={onChange}
          editable={editable}
          intl={this.props.intl}
        />
      );
    }
  };
}
