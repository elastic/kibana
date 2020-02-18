/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { Capabilities } from 'src/core/public';
import { Space } from '../../../../../../../spaces/public';
import { Feature } from '../../../../../../../features/public';
import { KibanaPrivileges, Role } from '../../../../../../common/model';
import { KibanaPrivilegeCalculatorFactory } from './kibana_privilege_calculator';
import { RoleValidator } from '../../validate_role';
import { CollapsiblePanel } from '../../collapsible_panel';
import { SimplePrivilegeSection } from './simple_privilege_section';
import { SpaceAwarePrivilegeSection } from './space_aware_privilege_section';
import { TransformErrorSection } from './transform_error_section';

interface Props {
  role: Role;
  spacesEnabled: boolean;
  spaces?: Space[];
  uiCapabilities: Capabilities;
  features: Feature[];
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

    const privilegeCalculatorFactory = new KibanaPrivilegeCalculatorFactory(kibanaPrivileges);

    if (spacesEnabled) {
      return (
        <SpaceAwarePrivilegeSection
          kibanaPrivileges={kibanaPrivileges}
          role={role}
          privilegeCalculatorFactory={privilegeCalculatorFactory}
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
        <SimplePrivilegeSection
          kibanaPrivileges={kibanaPrivileges}
          features={features}
          role={role}
          privilegeCalculatorFactory={privilegeCalculatorFactory}
          onChange={onChange}
          editable={editable}
        />
      );
    }
  };
}
