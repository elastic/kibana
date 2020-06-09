/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSwitch,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import _ from 'lodash';
import React, { ChangeEvent, Component, Fragment } from 'react';
import { RoleIndexPrivilege } from '../../../../../../common/model';
import { RoleValidator } from '../../validate_role';

const fromOption = (option: any) => option.label;
const toOption = (value: string) => ({ label: value });

interface Props {
  formIndex: number;
  indexPrivilege: RoleIndexPrivilege;
  indexPatterns: string[];
  availableIndexPrivileges: string[];
  availableFields: string[];
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
}

export class IndexPrivilegeForm extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const { grant, except } = this.getFieldSecurity(props.indexPrivilege);

    this.state = {
      queryExpanded: !!props.indexPrivilege.query,
      fieldSecurityExpanded: this.isFieldSecurityConfigured(props.indexPrivilege),
      grantedFields: grant,
      exceptedFields: except,
      documentQuery: props.indexPrivilege.query,
    };
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

  private getFieldLevelControls = () => {
    const {
      allowFieldLevelSecurity,
      allowDocumentLevelSecurity,
      availableFields,
      indexPrivilege,
      isRoleReadOnly,
    } = this.props;

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
                        options={availableFields ? availableFields.map(toOption) : []}
                        selectedOptions={grant.map(toOption)}
                        onCreateOption={this.onCreateGrantedField}
                        onChange={this.onGrantedFieldsChange}
                        isDisabled={this.props.isRoleReadOnly}
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
                        options={availableFields ? availableFields.map(toOption) : []}
                        selectedOptions={except.map(toOption)}
                        onCreateOption={this.onCreateDeniedField}
                        onChange={this.onDeniedFieldsChange}
                        isDisabled={isRoleReadOnly}
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
            {
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
            }
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
            >
              <EuiTextArea
                data-test-subj={`queryInput${this.props.formIndex}`}
                style={{ resize: 'none' }}
                fullWidth={true}
                value={indexPrivilege.query}
                onChange={this.onQueryChange}
                readOnly={this.props.isRoleReadOnly}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
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
  };

  private onIndexPatternsChange = (newPatterns: EuiComboBoxOptionOption[]) => {
    this.props.onChange({
      ...this.props.indexPrivilege,
      names: newPatterns.map(fromOption),
    });
  };

  private onPrivilegeChange = (newPrivileges: EuiComboBoxOptionOption[]) => {
    this.props.onChange({
      ...this.props.indexPrivilege,
      privileges: newPrivileges.map(fromOption),
    });
  };

  private onQueryChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    this.props.onChange({
      ...this.props.indexPrivilege,
      query: e.target.value,
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
