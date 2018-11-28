/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nProvider, InjectedIntl } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { UICapabilities } from 'ui/capabilities';
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
  kibanaAppPrivileges: KibanaPrivilege[];
  onChange: (role: Role) => void;
  validator: RoleValidator;
  intl: InjectedIntl;
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
      features,
    } = this.props;

    if (spacesEnabled) {
      return (
        <SpaceAwarePrivilegeForm
          kibanaAppPrivileges={kibanaAppPrivileges}
          role={role}
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
          kibanaAppPrivileges={kibanaAppPrivileges}
          features={features}
          role={role}
          onChange={onChange}
          editable={editable}
          intl={this.props.intl}
        />
      );
    }
  };
}
