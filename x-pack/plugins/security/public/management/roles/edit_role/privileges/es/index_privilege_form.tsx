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
  EuiHorizontalRule,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import _ from 'lodash';
import React, { Component, Fragment } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditorField } from '@kbn/kibana-react-plugin/public';
import type { monaco } from '@kbn/monaco';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type { RoleIndexPrivilege } from '../../../../../../common/model';
import type { IndicesAPIClient } from '../../../indices_api_client';
import type { RoleValidator } from '../../validate_role';

const fromOption = (option: any) => option.label;
const toOption = (value: string) => ({ label: value });

interface Props {
  formIndex: number;
  indexPrivilege: RoleIndexPrivilege;
  indexPatterns: string[];
  availableIndexPrivileges: string[];
  indicesAPIClient: PublicMethodsOf<IndicesAPIClient>;
  onChange: (indexPrivilege: RoleIndexPrivilege) => void;
  onDelete: () => void;
  isRoleReadOnly: boolean;
  allowDocumentLevelSecurity: boolean;
  allowFieldLevelSecurity: boolean;
  validator: RoleValidator;
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
        <EuiHorizontalRule />
        <EuiFlexGroup className="index-privilege-form">
          <EuiFlexItem>{this.getPrivilegeForm()}</EuiFlexItem>
          {!this.props.isRoleReadOnly && (
            <EuiFlexItem grow={false}>
              <EuiFormRow hasEmptyLabelSpace>
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.security.management.editRole.indexPrivilegeForm.deleteSpacePrivilegeAriaLabel',
                    { defaultMessage: 'Delete index privilege' }
                  )}
                  color={'danger'}
                  onClick={this.props.onDelete}
                  iconType={'trash'}
                />
              </EuiFormRow>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </Fragment>
    );
  }

  private getPrivilegeForm = () => {
    return (
      <Fragment>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.security.management.editRole.indexPrivilegeForm.indicesFormRowLabel"
                  defaultMessage="Indices"
                />
              }
              fullWidth={true}
              {...this.props.validator.validateIndexPrivilege(this.props.indexPrivilege)}
            >
              <EuiComboBox
                data-test-subj={`indicesInput${this.props.formIndex}`}
                options={this.props.indexPatterns.map(toOption)}
                selectedOptions={this.props.indexPrivilege.names.map(toOption)}
                onCreateOption={this.onCreateIndexPatternOption}
                onChange={this.onIndexPatternsChange}
                isDisabled={this.props.isRoleReadOnly}
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
              fullWidth={true}
            >
              <EuiComboBox
                data-test-subj={`privilegesInput${this.props.formIndex}`}
                options={this.props.availableIndexPrivileges.map(toOption)}
                selectedOptions={this.props.indexPrivilege.privileges.map(toOption)}
                onChange={this.onPrivilegeChange}
                onCreateOption={this.onCreateCustomPrivilege}
                isDisabled={this.props.isRoleReadOnly}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />

        {this.getFieldLevelControls()}

        {this.getGrantedDocumentsControl()}
      </Fragment>
    );
  };

  private loadFLSOptions = (indexNames: string[], force = false) => {
    if (!force && (this.isFieldListLoading || indexNames.length === 0)) return;

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
    const { allowFieldLevelSecurity, allowDocumentLevelSecurity, indexPrivilege, isRoleReadOnly } =
      this.props;

    if (!allowFieldLevelSecurity) {
      return null;
    }

    const { grant, except } = this.getFieldSecurity(indexPrivilege);

    return (
      <>
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
                    fullWidth={true}
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
                    <Fragment>
                      <EuiComboBox
                        data-test-subj={`fieldInput${this.props.formIndex}`}
                        options={this.state.flsOptions.map(toOption)}
                        selectedOptions={grant.map(toOption)}
                        onCreateOption={this.onCreateGrantedField}
                        onChange={this.onGrantedFieldsChange}
                        isDisabled={this.props.isRoleReadOnly}
                        async={true}
                        isLoading={this.state.isFieldListLoading}
                      />
                    </Fragment>
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
                    fullWidth={true}
                    className="indexPrivilegeForm__deniedFieldsRow"
                  >
                    <Fragment>
                      <EuiComboBox
                        data-test-subj={`deniedFieldInput${this.props.formIndex}`}
                        options={this.state.flsOptions.map(toOption)}
                        selectedOptions={except.map(toOption)}
                        onCreateOption={this.onCreateDeniedField}
                        onChange={this.onDeniedFieldsChange}
                        isDisabled={isRoleReadOnly}
                        async={true}
                        isLoading={this.state.isFieldListLoading}
                      />
                    </Fragment>
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {allowDocumentLevelSecurity && <EuiSpacer />}
      </>
    );
  };

  private getGrantedDocumentsControl = () => {
    const { allowDocumentLevelSecurity, indexPrivilege, isRoleReadOnly } = this.props;

    if (!allowDocumentLevelSecurity) {
      return null;
    }

    return (
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
              fullWidth={true}
              data-test-subj={`queryInput${this.props.formIndex}`}
            >
              <CodeEditorField
                languageId="xjson"
                width="100%"
                fullWidth={true}
                height={this.state.documentQueryEditorHeight}
                aria-label={i18n.translate(
                  'xpack.security.management.editRole.indexPrivilegeForm.grantedDocumentsQueryEditorAriaLabel',
                  {
                    defaultMessage: 'Granted documents query editor',
                  }
                )}
                value={indexPrivilege.query ?? ''}
                onChange={this.onQueryChange}
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

  private getFieldSecurity = (indexPrivilege: RoleIndexPrivilege) => {
    const { grant = [], except = [] } = indexPrivilege.field_security || {};
    return { grant, except };
  };

  private isFieldSecurityConfigured = (indexPrivilege: RoleIndexPrivilege) => {
    const { grant, except } = this.getFieldSecurity(indexPrivilege);
    return except.length > 0 || (grant.length > 0 && !_.isEqual(grant, ['*']));
  };
}
