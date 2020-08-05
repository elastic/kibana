/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { Capabilities } from 'src/core/public';
import { Space } from '../../../../../../../spaces/public';
import { Role } from '../../../../../../common/model';
import { RoleValidator } from '../../validate_role';
import { CollapsiblePanel } from '../../collapsible_panel';
import { SimplePrivilegeSection } from './simple_privilege_section';
import { SpaceAwarePrivilegeSection } from './space_aware_privilege_section';
import { TransformErrorSection } from './transform_error_section';
import { KibanaPrivileges } from '../../../model';

interface Props {
  role: Role;
  spacesEnabled: boolean;
  canCustomizeSubFeaturePrivileges: boolean;
  spaces?: Space[];
  uiCapabilities: Capabilities;
  editable: boolean;
  kibanaPrivileges: KibanaPrivileges;
  onChange: (role: Role) => void;
  validator: RoleValidator;
}

export class KibanaPrivilegesRegion extends Component<Props, {}> {
  public render() {
    return (
      <CollapsiblePanel iconType={'logoKibana'} title={'Kibana'}>
        {this.getForm()}
      </CollapsiblePanel>
    );
  }

  public getForm = () => {
    const {
      kibanaPrivileges,
      role,
      spacesEnabled,
      canCustomizeSubFeaturePrivileges,
      spaces = [],
      uiCapabilities,
      onChange,
      editable,
      validator,
    } = this.props;

    if (role._transform_error && role._transform_error.includes('kibana')) {
      return <TransformErrorSection />;
    }

    if (spacesEnabled) {
      return (
        <SpaceAwarePrivilegeSection
          kibanaPrivileges={kibanaPrivileges}
          role={role}
          spaces={spaces}
          uiCapabilities={uiCapabilities}
          onChange={onChange}
          editable={editable}
          canCustomizeSubFeaturePrivileges={canCustomizeSubFeaturePrivileges}
          validator={validator}
        />
      );
    } else {
      return (
        <SimplePrivilegeSection
          kibanaPrivileges={kibanaPrivileges}
          role={role}
          onChange={onChange}
          editable={editable}
          canCustomizeSubFeaturePrivileges={canCustomizeSubFeaturePrivileges}
        />
      );
    }
  };
}
