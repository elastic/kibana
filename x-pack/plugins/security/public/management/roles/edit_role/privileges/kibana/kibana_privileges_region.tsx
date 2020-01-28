/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { Capabilities } from 'src/core/public';
import { Space } from '../../../../../../../spaces/common/model/space';
import { KibanaPrivileges, Role, SecuredFeature } from '../../../../../../common/model';
import { RoleValidator } from '../../validate_role';
import { CollapsiblePanel } from '../../collapsible_panel';
import { SimplePrivilegeSection } from './simple_privilege_section';
import { SpaceAwarePrivilegeSection } from './poc_space_aware_privilege_section';
import { TransformErrorSection } from './transform_error_section';
import { PrivilegeCalculator } from './privilege_calculator';

interface Props {
  role: Role;
  spacesEnabled: boolean;
  spaces?: Space[];
  uiCapabilities: Capabilities;
  features: SecuredFeature[];
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
      spaces = [],
      uiCapabilities,
      onChange,
      editable,
      validator,
      features,
    } = this.props;

    if (role._transform_error && role._transform_error.includes('kibana')) {
      return <TransformErrorSection />;
    }

    const privilegeCalculator = new PrivilegeCalculator(kibanaPrivileges);

    if (spacesEnabled) {
      return (
        <SpaceAwarePrivilegeSection
          kibanaPrivileges={kibanaPrivileges}
          role={role}
          privilegeCalculator={privilegeCalculator}
          spaces={spaces}
          uiCapabilities={uiCapabilities}
          onChange={onChange}
          editable={editable}
          validator={validator}
        />
      );
    } else {
      // TODO
      return (
        <SimplePrivilegeSection
          kibanaPrivileges={kibanaPrivileges}
          features={features}
          role={role}
          privilegeCalculator={privilegeCalculator}
          onChange={onChange}
          editable={editable}
        />
      );
    }
  };
}
