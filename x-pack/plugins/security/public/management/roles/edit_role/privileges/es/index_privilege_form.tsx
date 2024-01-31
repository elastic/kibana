/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import _ from 'lodash';
import React, { Component, Fragment } from 'react';

import { CodeEditorField } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { monaco } from '@kbn/monaco';
import type { Cluster } from '@kbn/remote-clusters-plugin/public';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type { RoleIndexPrivilege, RoleRemoteIndexPrivilege } from '../../../../../../common';
import type { IndicesAPIClient } from '../../../indices_api_client';
import type { RoleValidator } from '../../validate_role';

const fromOption = (option: EuiComboBoxOptionOption) => option.label;
const toOption = (value: string): EuiComboBoxOptionOption => ({ label: value });

interface Props {
  formIndex: number;
  indexType: 'indices' | 'remote_indices';
  indexPrivilege: RoleIndexPrivilege | RoleRemoteIndexPrivilege;
  remoteClusters?: Cluster[];
  indexPatterns: string[];
  availableIndexPrivileges: string[];
  indicesAPIClient: PublicMethodsOf<IndicesAPIClient>;
  onChange: (indexPrivilege: RoleIndexPrivilege | RoleRemoteIndexPrivilege) => void;
  onDelete: () => void;
  isRoleReadOnly: boolean;
  allowDocumentLevelSecurity: boolean;
  allowFieldLevelSecurity: boolean;
  validator: RoleValidator;
  isDarkMode?: boolean;
}

interface State {
  queryExpanded: boolean;
  fieldSecurityExpanded: boolean;
  grantedFields: string[];
  exceptedFields: string[];
  documentQuery?: string;
  documentQueryEditorHeight: string;
  isFieldListLoading: boolean;
  flsOptions: string[];
}

export class IndexPrivilegeForm extends Component<Props, State> {
  // This is distinct from the field within `this.state`.
  // We want to make sure that only one request for fields is in-flight at a time,
  // and relying on state for this is error prone.
  private isFieldListLoading: boolean = false;

  constructor(props: Props) {
    super(props);

    const { grant, except } = this.getFieldSecurity(props.indexPrivilege);

    this.state = {
      queryExpanded: !!props.indexPrivilege.query,
      fieldSecurityExpanded: this.isFieldSecurityConfigured(props.indexPrivilege),
      grantedFields: grant,
      exceptedFields: except,
      documentQuery: props.indexPrivilege.query,
      documentQueryEditorHeight: '100px',
      isFieldListLoading: false,
      flsOptions: [],
    };
  }

  public componentDidMount() {
    if (this.state.fieldSecurityExpanded && this.props.allowFieldLevelSecurity) {
      this.loadFLSOptions(this.props.indexPrivilege.names);
    }
  }

  public render() {
    return (
      <Fragment>
        <EuiSpacer size="m" />
        <EuiFlexGroup alignItems="center" responsive={false} className="index-privilege-form">
          <EuiFlexItem>
            <EuiPanel color="subdued">{this.getPrivilegeForm()}</EuiPanel>
          </EuiFlexItem>
          {!this.props.isRoleReadOnly && (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={
                  this.props.indexType === 'remote_indices'
                    ? i18n.translate(
                        'xpack.security.management.editRole.indexPrivilegeForm.deleteRemoteIndexPrivilegeAriaLabel',
                        { defaultMessage: 'Delete remote index privilege' }
                      )
                    : i18n.translate(
                        'xpack.security.management.editRole.indexPrivilegeForm.deleteIndexPrivilegeAriaLabel',
                        { defaultMessage: 'Delete index privilege' }
                      )
                }
                color={'danger'}
                onClick={this.props.onDelete}
                iconType={'trash'}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </Fragment>
    );
  }

  private getPrivilegeForm = () => {
    const remoteClusterOptions: EuiComboBoxOptionOption[] = [];
    if (this.props.remoteClusters) {
      const incompatibleOptions: EuiComboBoxOptionOption[] = [];
      this.props.remoteClusters.forEach((item, i) => {
        const disabled = item.securityModel !== 'api_key';
        if (!disabled) {
          remoteClusterOptions.push({
            label: item.name,
          });
        } else {
          incompatibleOptions.push({
            label: item.name,
            disabled,
            append: disabled ? (
              <EuiIconTip
                type="warning"
                color="inherit"
                content={
                  <FormattedMessage
                    id="xpack.security.management.editRole.indexPrivilegeForm.remoteIndicesSecurityModelWarning"
                    defaultMessage="This cluster is configured with the certificate based security model and does not support remote index privileges. Connect this cluster with the API key based security model instead to use remote index privileges."
                  />
                }
              />
            ) : undefined,
          });
        }
      });
      if (incompatibleOptions.length) {
        remoteClusterOptions.push(
          {
            label: 'Incompatible clusters',
            isGroupLabelOption: true,
          },
          ...incompatibleOptions
        );
      }
    }

    return (
      <>
        <EuiFlexGroup>
          {this.props.indexType === 'remote_indices' ? (
            <EuiFlexItem>
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.security.management.editRole.indexPrivilegeForm.clustersFormRowLabel"
                    defaultMessage="Remote clusters"
                  />
                }
                fullWidth
                {...this.props.validator.validateRemoteIndexPrivilegeClustersField(
                  this.props.indexPrivilege as RoleRemoteIndexPrivilege
                )}
              >
                <EuiComboBox
                  data-test-subj={`clustersInput${this.props.formIndex}`}
                  options={remoteClusterOptions}
                  selectedOptions={('clusters' in this.props.indexPrivilege &&
                  this.props.indexPrivilege.clusters
                    ? this.props.indexPrivilege.clusters
                    : []
                  ).map(toOption)}
                  onCreateOption={this.onCreateClusterOption}
                  onChange={this.onClustersChange}
                  isDisabled={this.props.isRoleReadOnly}
                  placeholder={i18n.translate(
                    'xpack.security.management.editRole.indexPrivilegeForm.clustersPlaceholder',
                    { defaultMessage: 'Add a remote cluster…' }
                  )}
                  fullWidth
                />
              </EuiFormRow>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <EuiFormRow
              label={
                this.props.indexType === 'remote_indices' ? (
                  <FormattedMessage
                    id="xpack.security.management.editRole.indexPrivilegeForm.remoteIndicesFormRowLabel"
                    defaultMessage="Remote indices"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.security.management.editRole.indexPrivilegeForm.indicesFormRowLabel"
                    defaultMessage="Indices"
                  />
                )
              }
              fullWidth
              {...this.props.validator.validateIndexPrivilegeNamesField(this.props.indexPrivilege)}
            >
              <EuiComboBox
                data-test-subj={`indicesInput${this.props.formIndex}`}
                options={this.props.indexPatterns.map(toOption)}
                selectedOptions={this.props.indexPrivilege.names.map(toOption)}
                onCreateOption={this.onCreateIndexPatternOption}
                onChange={this.onIndexPatternsChange}
                isDisabled={this.props.isRoleReadOnly}
                placeholder={i18n.translate(
                  'xpack.security.management.editRole.indexPrivilegeForm.indicesPlaceholder',
                  { defaultMessage: 'Add an index pattern…' }
                )}
                fullWidth
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.security.management.editRole.indexPrivilegeForm.privilegesFormRowLabel"
                  defaultMessage="Privileges"
                />
              }
              fullWidth
              {...this.props.validator.validateIndexPrivilegePrivilegesField(
                this.props.indexPrivilege
              )}
            >
              <EuiComboBox
                data-test-subj={`privilegesInput${this.props.formIndex}`}
                options={this.props.availableIndexPrivileges.map(toOption)}
                selectedOptions={this.props.indexPrivilege.privileges.map(toOption)}
                onChange={this.onPrivilegeChange}
                onCreateOption={this.onCreateCustomPrivilege}
                isDisabled={this.props.isRoleReadOnly}
                placeholder={i18n.translate(
                  'xpack.security.management.editRole.indexPrivilegeForm.privilegesPlaceholder',
                  { defaultMessage: 'Add an action…' }
                )}
                fullWidth
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        {this.getFieldLevelControls()}
        {this.getGrantedDocumentsControl()}
      </>
    );
  };

  private loadFLSOptions = (indexNames: string[], force = false) => {
    if (
      this.props.indexType === 'remote_indices' ||
      (!force && (this.isFieldListLoading || indexNames.length === 0))
    ) {
      return;
    }

    this.isFieldListLoading = true;
    this.setState({
      isFieldListLoading: true,
    });

    this.props.indicesAPIClient
      .getFields(indexNames.join(','))
      .then((fields) => {
        this.isFieldListLoading = false;
        this.setState({ flsOptions: fields, isFieldListLoading: false });
      })
      .catch(() => {
        this.isFieldListLoading = false;
        this.setState({ flsOptions: [], isFieldListLoading: false });
      });
  };

  private getFieldLevelControls = () => {
    const { allowFieldLevelSecurity, indexPrivilege, isRoleReadOnly } = this.props;
    const { grant, except } = this.getFieldSecurity(indexPrivilege);

    if (!allowFieldLevelSecurity) {
      return null;
    }

    if (isRoleReadOnly && !this.state.fieldSecurityExpanded) {
      return null;
    }

    return (
      <>
        <EuiSpacer />
        <EuiFlexGroup direction="column">
          {!isRoleReadOnly && (
            <EuiFlexItem>
              {
                <EuiSwitch
                  data-test-subj={`restrictFieldsQuery${this.props.formIndex}`}
                  label={
                    <FormattedMessage
                      id="xpack.security.management.editRoles.indexPrivilegeForm.grantFieldPrivilegesLabel"
                      defaultMessage="Grant access to specific fields"
                    />
                  }
                  compressed={true}
                  checked={this.state.fieldSecurityExpanded}
                  onChange={this.toggleFieldSecurity}
                />
              }
            </EuiFlexItem>
          )}
          {this.state.fieldSecurityExpanded && (
            <EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="xpack.security.management.editRoles.indexPrivilegeForm.grantedFieldsFormRowLabel"
                        defaultMessage="Granted fields"
                      />
                    }
                    fullWidth
                    className="indexPrivilegeForm__grantedFieldsRow"
                    helpText={
                      !isRoleReadOnly && grant.length === 0 ? (
                        <FormattedMessage
                          id="xpack.security.management.editRoles.indexPrivilegeForm.grantedFieldsFormRowHelpText"
                          defaultMessage="If no fields are granted, then users assigned to this role will not be able to see any data for this index."
                        />
                      ) : undefined
                    }
                  >
                    <EuiComboBox
                      data-test-subj={`fieldInput${this.props.formIndex}`}
                      options={this.state.flsOptions.map(toOption)}
                      selectedOptions={grant.map(toOption)}
                      onCreateOption={this.onCreateGrantedField}
                      onChange={this.onGrantedFieldsChange}
                      isDisabled={this.props.isRoleReadOnly}
                      async={true}
                      isLoading={this.state.isFieldListLoading}
                      placeholder={i18n.translate(
                        'xpack.security.management.editRole.indexPrivilegeForm.fieldPlaceholder',
                        { defaultMessage: 'Add a field pattern…' }
                      )}
                      fullWidth
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="xpack.security.management.editRoles.indexPrivilegeForm.deniedFieldsFormRowLabel"
                        defaultMessage="Denied fields"
                      />
                    }
                    fullWidth
                    className="indexPrivilegeForm__deniedFieldsRow"
                  >
                    <EuiComboBox
                      data-test-subj={`deniedFieldInput${this.props.formIndex}`}
                      options={this.state.flsOptions.map(toOption)}
                      selectedOptions={except.map(toOption)}
                      onCreateOption={this.onCreateDeniedField}
                      onChange={this.onDeniedFieldsChange}
                      isDisabled={isRoleReadOnly}
                      async={true}
                      isLoading={this.state.isFieldListLoading}
                      placeholder={i18n.translate(
                        'xpack.security.management.editRole.indexPrivilegeForm.deniedFieldPlaceholder',
                        { defaultMessage: 'Add a field pattern…' }
                      )}
                      fullWidth
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </>
    );
  };

  private getGrantedDocumentsControl = () => {
    const { allowDocumentLevelSecurity, indexPrivilege, isRoleReadOnly } = this.props;

    if (!allowDocumentLevelSecurity) {
      return null;
    }

    if (this.props.isRoleReadOnly && !this.state.queryExpanded) {
      return null;
    }

    return (
      <>
        <EuiSpacer />
        <EuiFlexGroup direction="column">
          {!this.props.isRoleReadOnly && (
            <EuiFlexItem>
              <EuiSwitch
                data-test-subj={`restrictDocumentsQuery${this.props.formIndex}`}
                label={
                  <FormattedMessage
                    id="xpack.security.management.editRole.indexPrivilegeForm.grantReadPrivilegesLabel"
                    defaultMessage="Grant read privileges to specific documents"
                  />
                }
                compressed={true}
                checked={this.state.queryExpanded}
                onChange={this.toggleDocumentQuery}
                disabled={isRoleReadOnly}
              />
            </EuiFlexItem>
          )}
          {this.state.queryExpanded && (
            <EuiFlexItem>
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.security.management.editRole.indexPrivilegeForm.grantedDocumentsQueryFormRowLabel"
                    defaultMessage="Granted documents query"
                  />
                }
                fullWidth
                data-test-subj={`queryInput${this.props.formIndex}`}
              >
                <CodeEditorField
                  languageId="xjson"
                  width="100%"
                  fullWidth
                  height={this.state.documentQueryEditorHeight}
                  aria-label={i18n.translate(
                    'xpack.security.management.editRole.indexPrivilegeForm.grantedDocumentsQueryEditorAriaLabel',
                    {
                      defaultMessage: 'Granted documents query editor',
                    }
                  )}
                  value={indexPrivilege.query ?? ''}
                  onChange={this.onQueryChange}
                  useDarkTheme={this.props.isDarkMode}
                  options={{
                    readOnly: this.props.isRoleReadOnly,
                    minimap: {
                      enabled: false,
                    },
                    // Prevent an empty form from showing an error
                    renderValidationDecorations: indexPrivilege.query ? 'editable' : 'off',
                  }}
                  editorDidMount={this.editorDidMount}
                />
              </EuiFormRow>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </>
    );
  };

  private editorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    /**
     * Resize the editor based on the contents of the editor itself.
     * Adapted from https://github.com/microsoft/monaco-editor/issues/794#issuecomment-688959283
     */

    const minHeight = 100;
    const maxHeight = 1000;

    const updateHeight = () => {
      const contentHeight = Math.min(maxHeight, Math.max(minHeight, editor.getContentHeight()));
      this.setState({ documentQueryEditorHeight: `${contentHeight}px` });
    };

    editor.onDidContentSizeChange(updateHeight);
    updateHeight();
  };

  private toggleDocumentQuery = () => {
    const willToggleOff = this.state.queryExpanded;
    const willToggleOn = !willToggleOff;

    // If turning off, then save the current query in state so that we can restore it if the user changes their mind.
    this.setState({
      queryExpanded: !this.state.queryExpanded,
      documentQuery: willToggleOff ? this.props.indexPrivilege.query : this.state.documentQuery,
    });

    // If turning off, then remove the query from the Index Privilege
    if (willToggleOff) {
      this.props.onChange({
        ...this.props.indexPrivilege,
        query: '',
      });
    }

    // If turning on, then restore the saved query if available
    if (willToggleOn && !this.props.indexPrivilege.query && this.state.documentQuery) {
      this.props.onChange({
        ...this.props.indexPrivilege,
        query: this.state.documentQuery,
      });
    }
  };

  private toggleFieldSecurity = () => {
    const willToggleOff = this.state.fieldSecurityExpanded;
    const willToggleOn = !willToggleOff;

    const { grant, except } = this.getFieldSecurity(this.props.indexPrivilege);

    // If turning off, then save the current configuration in state so that we can restore it if the user changes their mind.
    this.setState({
      fieldSecurityExpanded: !this.state.fieldSecurityExpanded,
      grantedFields: willToggleOff ? grant : this.state.grantedFields,
      exceptedFields: willToggleOff ? except : this.state.exceptedFields,
    });

    // If turning off, then remove the field security from the Index Privilege
    if (willToggleOff) {
      this.props.onChange({
        ...this.props.indexPrivilege,
        field_security: {
          grant: ['*'],
          except: [],
        },
      });
    }

    // If turning on, then restore the saved field security if available
    const hasConfiguredFieldSecurity = this.isFieldSecurityConfigured(this.props.indexPrivilege);

    const hasSavedFieldSecurity =
      this.state.exceptedFields.length > 0 || this.state.grantedFields.length > 0;

    // If turning on, then request available fields
    if (willToggleOn) {
      this.loadFLSOptions(this.props.indexPrivilege.names);
    }

    if (willToggleOn && !hasConfiguredFieldSecurity && hasSavedFieldSecurity) {
      this.props.onChange({
        ...this.props.indexPrivilege,
        field_security: {
          grant: this.state.grantedFields,
          except: this.state.exceptedFields,
        },
      });
    }
  };

  private onCreateClusterOption = (option: any) => {
    const nextClusters = (
      'clusters' in this.props.indexPrivilege && this.props.indexPrivilege.clusters
        ? this.props.indexPrivilege.clusters
        : []
    ).concat([option]);

    this.props.onChange({
      ...this.props.indexPrivilege,
      clusters: nextClusters,
    });
  };

  private onClustersChange = (nextOptions: EuiComboBoxOptionOption[]) => {
    const clusters = nextOptions.map(fromOption);
    this.props.onChange({
      ...this.props.indexPrivilege,
      clusters,
    });
  };

  private onCreateIndexPatternOption = (option: any) => {
    const newIndexPatterns = this.props.indexPrivilege.names.concat([option]);

    this.props.onChange({
      ...this.props.indexPrivilege,
      names: newIndexPatterns,
    });
    // If FLS controls are visible, then forcefully request a new set of options
    if (this.state.fieldSecurityExpanded) {
      this.loadFLSOptions(newIndexPatterns, true);
    }
  };

  private onIndexPatternsChange = (newPatterns: EuiComboBoxOptionOption[]) => {
    const names = newPatterns.map(fromOption);
    this.props.onChange({
      ...this.props.indexPrivilege,
      names,
    });
    // If FLS controls are visible, then forcefully request a new set of options
    if (this.state.fieldSecurityExpanded) {
      this.loadFLSOptions(names, true);
    }
  };

  private onPrivilegeChange = (newPrivileges: EuiComboBoxOptionOption[]) => {
    this.props.onChange({
      ...this.props.indexPrivilege,
      privileges: newPrivileges.map(fromOption),
    });
  };

  private onCreateCustomPrivilege = (customPrivilege: string) => {
    this.props.onChange({
      ...this.props.indexPrivilege,
      privileges: [...this.props.indexPrivilege.privileges, customPrivilege],
    });
  };

  private onQueryChange = (query: string) => {
    this.props.onChange({
      ...this.props.indexPrivilege,
      query,
    });
  };

  private onCreateGrantedField = (grant: string) => {
    if (
      !this.props.indexPrivilege.field_security ||
      !this.props.indexPrivilege.field_security.grant
    ) {
      return;
    }

    const newGrants = this.props.indexPrivilege.field_security.grant.concat([grant]);

    this.props.onChange({
      ...this.props.indexPrivilege,
      field_security: {
        ...this.props.indexPrivilege.field_security,
        grant: newGrants,
      },
    });
  };

  private onGrantedFieldsChange = (grantedFields: EuiComboBoxOptionOption[]) => {
    this.props.onChange({
      ...this.props.indexPrivilege,
      field_security: {
        ...this.props.indexPrivilege.field_security,
        grant: grantedFields.map(fromOption),
      },
    });
  };

  private onCreateDeniedField = (except: string) => {
    if (
      !this.props.indexPrivilege.field_security ||
      !this.props.indexPrivilege.field_security.except
    ) {
      return;
    }

    const newExcepts = this.props.indexPrivilege.field_security.except.concat([except]);

    this.props.onChange({
      ...this.props.indexPrivilege,
      field_security: {
        ...this.props.indexPrivilege.field_security,
        except: newExcepts,
      },
    });
  };

  private onDeniedFieldsChange = (deniedFields: EuiComboBoxOptionOption[]) => {
    this.props.onChange({
      ...this.props.indexPrivilege,
      field_security: {
        ...this.props.indexPrivilege.field_security,
        except: deniedFields.map(fromOption),
      },
    });
  };

  private getFieldSecurity = (indexPrivilege: RoleIndexPrivilege | RoleRemoteIndexPrivilege) => {
    const { grant = [], except = [] } = indexPrivilege.field_security || {};
    return { grant, except };
  };

  private isFieldSecurityConfigured = (
    indexPrivilege: RoleIndexPrivilege | RoleRemoteIndexPrivilege
  ) => {
    const { grant, except } = this.getFieldSecurity(indexPrivilege);
    return except.length > 0 || (grant.length > 0 && !_.isEqual(grant, ['*']));
  };
}
