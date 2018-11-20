/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

<<<<<<< HEAD
=======
import { I18nProvider } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import React, { Component } from 'react';
import { Space } from '../../../../../../../../spaces/common/model/space';
import { UserProfile } from '../../../../../../../../xpack_main/public/services/user_profile';
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
  userProfile: UserProfile;
  editable: boolean;
  kibanaAppPrivileges: KibanaPrivilege[];
  onChange: (role: Role) => void;
  validator: RoleValidator;
}

export class KibanaPrivileges extends Component<Props, {}> {
  public render() {
    return (
<<<<<<< HEAD
      <CollapsiblePanel iconType={'logoKibana'} title={'Kibana'}>
        {this.getForm()}
      </CollapsiblePanel>
=======
      <I18nProvider>
        <CollapsiblePanel iconType={'logoKibana'} title={'Kibana'}>
          {this.getForm()}
        </CollapsiblePanel>
      </I18nProvider>
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    );
  }

  public getForm = () => {
    const {
      kibanaAppPrivileges,
      role,
      spacesEnabled,
      spaces = [],
      userProfile,
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
          userProfile={userProfile}
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
