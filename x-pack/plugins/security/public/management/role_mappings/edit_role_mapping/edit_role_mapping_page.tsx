/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiLink,
  EuiPageHeader,
  EuiPageSection,
  EuiSpacer,
} from '@elastic/eui';
import React, { Component } from 'react';

import type { DocLinksStart, NotificationsStart, ScopedHistory } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type { RoleMapping } from '../../../../common/model';
import type { RolesAPIClient } from '../../roles';
import {
  DeleteProvider,
  NoCompatibleRealms,
  PermissionDenied,
  SectionLoading,
} from '../components';
import type { RoleMappingsAPIClient } from '../role_mappings_api_client';
import { MappingInfoPanel } from './mapping_info_panel';
import { RuleEditorPanel } from './rule_editor_panel';
import { validateRoleMappingForSave } from './services/role_mapping_validation';

interface State {
  loadState: 'loading' | 'permissionDenied' | 'ready' | 'saveInProgress';
  roleMapping: RoleMapping | null;
  hasCompatibleRealms: boolean;
  canUseStoredScripts: boolean;
  canUseInlineScripts: boolean;
  formError: {
    isInvalid: boolean;
    error?: string;
  };
  validateForm: boolean;
  rulesValid: boolean;
}

interface Props {
  action: 'edit' | 'clone';
  name?: string;
  roleMappingsAPI: PublicMethodsOf<RoleMappingsAPIClient>;
  rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
  notifications: NotificationsStart;
  docLinks: DocLinksStart;
  history: ScopedHistory;
  readOnly?: boolean;
}

export class EditRoleMappingPage extends Component<Props, State> {
  static defaultProps: Partial<Props> = {
    readOnly: false,
  };

  constructor(props: any) {
    super(props);
    this.state = {
      loadState: 'loading',
      roleMapping: null,
      hasCompatibleRealms: true,
      canUseStoredScripts: true,
      canUseInlineScripts: true,
      rulesValid: true,
      validateForm: false,
      formError: {
        isInvalid: false,
      },
    };
  }

  public componentDidMount() {
    this.loadAppData();
  }

  public async componentDidUpdate(prevProps: Props) {
    if (prevProps.name !== this.props.name) {
      await this.loadAppData();
    }
  }

  public render() {
    const { loadState } = this.state;

    if (loadState === 'permissionDenied') {
      return <PermissionDenied />;
    }

    if (loadState === 'loading') {
      return (
        <EuiPageSection alignment="center" color="subdued">
          <SectionLoading />
        </EuiPageSection>
      );
    }

    return (
      <>
        <EuiPageHeader
          bottomBorder
          pageTitle={this.getFormTitle()}
          description={
            <>
              <FormattedMessage
                id="xpack.security.management.editRoleMapping.roleMappingDescription"
                defaultMessage="Use role mappings to control which roles are assigned to your users. {learnMoreLink}"
                values={{
                  learnMoreLink: (
                    <EuiLink
                      href={this.props.docLinks.links.security.mappingRoles}
                      external={true}
                      target="_blank"
                    >
                      <FormattedMessage
                        id="xpack.security.management.editRoleMapping.learnMoreLinkText"
                        defaultMessage="Learn more about role mappings."
                      />
                    </EuiLink>
                  ),
                }}
              />
              {!this.state.hasCompatibleRealms && (
                <>
                  <EuiSpacer size="s" />
                  <NoCompatibleRealms />
                </>
              )}
            </>
          }
        />

        <EuiSpacer size="l" />

        <EuiForm isInvalid={this.state.formError.isInvalid} error={this.state.formError.error}>
          <MappingInfoPanel
            data-test-subj="roleMappingInfoPanel"
            roleMapping={this.state.roleMapping!}
            onChange={(roleMapping) => this.setState({ roleMapping })}
            mode={this.getInfoPanelMode()}
            validateForm={this.state.validateForm}
            canUseInlineScripts={this.state.canUseInlineScripts}
            canUseStoredScripts={this.state.canUseStoredScripts}
            rolesAPIClient={this.props.rolesAPIClient}
            docLinks={this.props.docLinks}
          />
          <EuiSpacer />
          <RuleEditorPanel
            data-test-subj="roleMappingRulePanel"
            rawRules={this.state.roleMapping!.rules}
            validateForm={this.state.validateForm}
            onValidityChange={this.onRuleValidityChange}
            onChange={(rules) =>
              this.setState({
                roleMapping: {
                  ...this.state.roleMapping!,
                  rules,
                },
              })
            }
            docLinks={this.props.docLinks}
            readOnly={this.props.readOnly}
          />
          <EuiSpacer />
          {this.getFormButtons()}
        </EuiForm>
      </>
    );
  }

  private getInfoPanelMode = () => {
    return this.props.readOnly ? 'view' : this.editingExistingRoleMapping() ? 'edit' : 'create';
  };

  private getFormTitle = () => {
    if (this.props.readOnly) {
      return (
        <FormattedMessage
          id="xpack.security.management.editRoleMapping.readOnlyRoleMappingTitle"
          defaultMessage="Viewing role mapping"
        />
      );
    }
    if (this.editingExistingRoleMapping()) {
      return (
        <FormattedMessage
          id="xpack.security.management.editRoleMapping.editRoleMappingTitle"
          defaultMessage="Edit role mapping"
        />
      );
    }
    return (
      <FormattedMessage
        id="xpack.security.management.editRoleMapping.createRoleMappingTitle"
        defaultMessage="Create role mapping"
      />
    );
  };

  private getFormButtons = () => {
    if (this.props.readOnly === true) {
      return this.getReturnToRoleMappingListButton();
    }

    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>{this.getSaveButton()}</EuiFlexItem>
        <EuiFlexItem grow={false}>{this.getCancelButton()}</EuiFlexItem>
        <EuiFlexItem grow={true} />
        {this.getDeleteButton()}
      </EuiFlexGroup>
    );
  };

  private getReturnToRoleMappingListButton = () => {
    return (
      <EuiButton
        // {...reactRouterNavigate(this.props.history, '')}
        onClick={this.backToRoleMappingsList}
        iconType="arrowLeft"
        data-test-subj="roleMappingFormReturnButton"
      >
        <FormattedMessage
          id="xpack.security.management.editRoleMapping.returnToRoleMappingListButton"
          defaultMessage="Back to role mappings"
        />
      </EuiButton>
    );
  };

  private getSaveButton = () => {
    return (
      <EuiButton
        fill
        onClick={this.saveRoleMapping}
        isLoading={this.state.loadState === 'saveInProgress'}
        disabled={!this.state.rulesValid || this.state.loadState === 'saveInProgress'}
        data-test-subj="saveRoleMappingButton"
      >
        <FormattedMessage
          id="xpack.security.management.editRoleMapping.saveRoleMappingButton"
          defaultMessage="Save role mapping"
        />
      </EuiButton>
    );
  };

  private getCancelButton = () => {
    return (
      <EuiButton onClick={this.backToRoleMappingsList}>
        <FormattedMessage
          id="xpack.security.management.editRoleMapping.cancelButton"
          defaultMessage="Cancel"
        />
      </EuiButton>
    );
  };

  private getDeleteButton = () => {
    if (this.editingExistingRoleMapping() && !this.props.readOnly) {
      return (
        <EuiFlexItem grow={false}>
          <DeleteProvider
            roleMappingsAPI={this.props.roleMappingsAPI}
            notifications={this.props.notifications}
          >
            {(deleteRoleMappingsPrompt) => {
              return (
                <EuiButtonEmpty
                  data-test-subj="deleteRoleMappingButton"
                  onClick={() =>
                    deleteRoleMappingsPrompt([this.state.roleMapping!], () =>
                      this.backToRoleMappingsList()
                    )
                  }
                  color="danger"
                >
                  <FormattedMessage
                    id="xpack.security.management.editRoleMapping.deleteRoleMappingButton"
                    defaultMessage="Delete role mapping"
                  />
                </EuiButtonEmpty>
              );
            }}
          </DeleteProvider>
        </EuiFlexItem>
      );
    }
    return null;
  };

  private onRuleValidityChange = (rulesValid: boolean) => {
    this.setState({
      rulesValid,
    });
  };

  private saveRoleMapping = () => {
    if (!this.state.roleMapping) {
      return;
    }

    const { isInvalid } = validateRoleMappingForSave(this.state.roleMapping);
    if (isInvalid) {
      this.setState({ validateForm: true });
      return;
    }

    const roleMappingName = this.state.roleMapping.name;

    this.setState({
      loadState: 'saveInProgress',
    });

    this.props.roleMappingsAPI
      .saveRoleMapping(this.state.roleMapping)
      .then(() => {
        this.props.notifications.toasts.addSuccess({
          title: i18n.translate('xpack.security.management.editRoleMapping.saveSuccess', {
            defaultMessage: `Saved role mapping '{roleMappingName}'`,
            values: {
              roleMappingName,
            },
          }),
          'data-test-subj': 'savedRoleMappingSuccessToast',
        });
        this.backToRoleMappingsList();
      })
      .catch((e) => {
        this.props.notifications.toasts.addError(e, {
          title: i18n.translate('xpack.security.management.editRoleMapping.saveError', {
            defaultMessage: `Error saving role mapping`,
          }),
          toastMessage: e?.body?.message,
        });

        this.setState({
          loadState: 'saveInProgress',
        });
      });
  };

  private editingExistingRoleMapping = () =>
    typeof this.props.name === 'string' && this.props.action === 'edit';

  private cloningExistingRoleMapping = () =>
    typeof this.props.name === 'string' && this.props.action === 'clone';

  private async loadAppData() {
    try {
      const [features, roleMapping] = await Promise.all([
        this.props.roleMappingsAPI.checkRoleMappingFeatures(),
        this.editingExistingRoleMapping() || this.cloningExistingRoleMapping()
          ? this.props.roleMappingsAPI.getRoleMapping(this.props.name!)
          : Promise.resolve({
              name: '',
              enabled: true,
              metadata: {},
              role_templates: [],
              roles: [],
              rules: {},
            }),
      ]);

      const {
        canManageRoleMappings,
        canUseStoredScripts,
        canUseInlineScripts,
        hasCompatibleRealms,
      } = features;

      const canLoad = canManageRoleMappings || this.props.readOnly;
      const loadState: State['loadState'] = canLoad ? 'ready' : 'permissionDenied';

      this.setState({
        loadState,
        hasCompatibleRealms,
        canUseStoredScripts,
        canUseInlineScripts,
        roleMapping: {
          ...roleMapping,
          name: this.cloningExistingRoleMapping() ? '' : roleMapping.name,
        },
      });
    } catch (e) {
      this.props.notifications.toasts.addDanger({
        title: i18n.translate(
          'xpack.security.management.editRoleMapping.table.fetchingRoleMappingsErrorMessage',
          {
            defaultMessage: 'Error loading role mapping editor: {message}',
            values: { message: e?.body?.message ?? '' },
          }
        ),
        'data-test-subj': 'errorLoadingRoleMappingEditorToast',
      });
      this.backToRoleMappingsList();
    }
  }

  private backToRoleMappingsList = () => this.props.history.push('/');
}
