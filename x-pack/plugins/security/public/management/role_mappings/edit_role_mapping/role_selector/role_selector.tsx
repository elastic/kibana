/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiHorizontalRule } from '@elastic/eui';
import React, { Fragment } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type { Role, RoleMapping } from '../../../../../common/model';
import { isRoleDeprecated } from '../../../../../common/model';
import { RoleComboBox } from '../../../role_combo_box';
import type { RolesAPIClient } from '../../../roles';
import { AddRoleTemplateButton } from './add_role_template_button';
import { RoleTemplateEditor } from './role_template_editor';

interface Props {
  rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
  roleMapping: RoleMapping;
  canUseInlineScripts: boolean;
  canUseStoredScripts: boolean;
  mode: 'roles' | 'templates';
  onChange: (roleMapping: RoleMapping) => void;
}

interface State {
  roles: Role[];
}

export class RoleSelector extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { roles: [] };
  }

  public async componentDidMount() {
    const roles = await this.props.rolesAPIClient.getRoles();
    this.setState({ roles });
  }

  public render() {
    const { mode } = this.props;
    return (
      <EuiFormRow fullWidth helpText={this.getHelpText()}>
        {mode === 'roles' ? this.getRoleComboBox() : this.getRoleTemplates()}
      </EuiFormRow>
    );
  }

  private getRoleComboBox = () => {
    const { roles = [] } = this.props.roleMapping;
    return (
      <RoleComboBox
        placeholder={i18n.translate(
          'xpack.security.management.editRoleMapping.selectRolesPlaceholder',
          { defaultMessage: 'Select one or more roles' }
        )}
        isLoading={this.state.roles.length === 0}
        availableRoles={this.state.roles}
        selectedRoleNames={roles}
        onChange={(selectedRoles) => {
          this.props.onChange({
            ...this.props.roleMapping,
            roles: selectedRoles,
            role_templates: [],
          });
        }}
      />
    );
  };

  private getRoleTemplates = () => {
    const { role_templates: roleTemplates = [] } = this.props.roleMapping;
    return (
      <div>
        {roleTemplates.map((rt, index) => (
          <Fragment key={index}>
            <RoleTemplateEditor
              canUseStoredScripts={this.props.canUseStoredScripts}
              canUseInlineScripts={this.props.canUseInlineScripts}
              roleTemplate={rt}
              onChange={(updatedTemplate) => {
                const templates = [...(this.props.roleMapping.role_templates || [])];
                templates.splice(index, 1, updatedTemplate);
                this.props.onChange({
                  ...this.props.roleMapping,
                  role_templates: templates,
                });
              }}
              onDelete={() => {
                const templates = [...(this.props.roleMapping.role_templates || [])];
                templates.splice(index, 1);
                this.props.onChange({
                  ...this.props.roleMapping,
                  role_templates: templates,
                });
              }}
            />
            <EuiHorizontalRule />
          </Fragment>
        ))}
        <AddRoleTemplateButton
          canUseStoredScripts={this.props.canUseStoredScripts}
          canUseInlineScripts={this.props.canUseInlineScripts}
          onClick={(type) => {
            switch (type) {
              case 'inline': {
                const templates = this.props.roleMapping.role_templates || [];
                this.props.onChange({
                  ...this.props.roleMapping,
                  roles: [],
                  role_templates: [...templates, { template: { source: '' } }],
                });
                break;
              }
              case 'stored': {
                const templates = this.props.roleMapping.role_templates || [];
                this.props.onChange({
                  ...this.props.roleMapping,
                  roles: [],
                  role_templates: [...templates, { template: { id: '' } }],
                });
                break;
              }
              default:
                throw new Error(`Unsupported template type: ${type}`);
            }
          }}
        />
      </div>
    );
  };

  private getHelpText = () => {
    if (this.props.mode === 'roles' && this.hasDeprecatedRolesAssigned()) {
      return (
        <span data-test-subj="deprecatedRolesAssigned">
          <FormattedMessage
            id="xpack.security.management.editRoleMapping.deprecatedRolesAssigned"
            defaultMessage="This mapping is assigned a deprecated role. Please migrate to a supported role."
          />
        </span>
      );
    }
  };

  private hasDeprecatedRolesAssigned = () => {
    return (
      this.props.roleMapping.roles?.some((r) =>
        this.state.roles.some((role) => role.name === r && isRoleDeprecated(role))
      ) ?? false
    );
  };
}
