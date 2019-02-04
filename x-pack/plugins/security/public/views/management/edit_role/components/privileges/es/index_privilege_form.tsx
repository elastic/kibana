/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiComboBoxOptionProps,
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
import React, { ChangeEvent, Component, Fragment } from 'react';
import { IndexPrivilege } from '../../../../../../../common/model/index_privilege';
// @ts-ignore
import { getIndexPrivileges } from '../../../../../../services/role_privileges';
import { RoleValidator } from '../../../lib/validate_role';

const fromOption = (option: any) => option.label;
const toOption = (value: string) => ({ label: value, isGroupLabelOption: false });

interface Props {
  formIndex: number;
  indexPrivilege: IndexPrivilege;
  indexPatterns: string[];
  availableFields: string[];
  onChange: (indexPrivilege: IndexPrivilege) => void;
  onDelete: () => void;
  isReservedRole: boolean;
  allowDelete: boolean;
  allowDocumentLevelSecurity: boolean;
  allowFieldLevelSecurity: boolean;
  validator: RoleValidator;
}

interface State {
  queryExpanded: boolean;
  documentQuery?: string;
}

export class IndexPrivilegeForm extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      queryExpanded: !!props.indexPrivilege.query,
      documentQuery: props.indexPrivilege.query,
    };
  }

  public render() {
    return (
      <Fragment>
        <EuiHorizontalRule />
        <EuiFlexGroup className="index-privilege-form">
          <EuiFlexItem>{this.getPrivilegeForm()}</EuiFlexItem>
          {this.props.allowDelete && (
            <EuiFlexItem grow={false}>
              <EuiFormRow hasEmptyLabelSpace>
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.security.management.editRoles.indexPrivilegeForm.deleteSpacePrivilegeAriaLabel',
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

  public getPrivilegeForm = () => {
    return (
      <Fragment>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.security.management.editRoles.indexPrivilegeForm.indicesFormRowLabel"
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
                isDisabled={this.props.isReservedRole}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.security.management.editRoles.indexPrivilegeForm.privilegesFormRowLabel"
                  defaultMessage="Privileges"
                />
              }
              fullWidth={true}
            >
              <EuiComboBox
                data-test-subj={`privilegesInput${this.props.formIndex}`}
                options={getIndexPrivileges().map(toOption)}
                selectedOptions={this.props.indexPrivilege.privileges.map(toOption)}
                onChange={this.onPrivilegeChange}
                isDisabled={this.props.isReservedRole}
              />
            </EuiFormRow>
          </EuiFlexItem>
          {this.getGrantedFieldsControl()}
        </EuiFlexGroup>

        <EuiSpacer />

        {this.getGrantedDocumentsControl()}
      </Fragment>
    );
  };

  public getGrantedFieldsControl = () => {
    const { allowFieldLevelSecurity, availableFields, indexPrivilege, isReservedRole } = this.props;

    if (!allowFieldLevelSecurity) {
      return null;
    }

    const { grant = [] } = indexPrivilege.field_security || {};

    if (allowFieldLevelSecurity) {
      return (
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.security.management.editRoles.indexPrivilegeForm.grantedFieldsFormRowLabel"
                defaultMessage="Granted fields (optional)"
              />
            }
            fullWidth={true}
            className="indexPrivilegeForm__grantedFieldsRow"
            helpText={
              !isReservedRole && grant.length === 0 ? (
                <FormattedMessage
                  id="xpack.security.management.editRoles.indexPrivilegeForm.grantedFieldsFormRowHelpText"
                  defaultMessage="If no fields are granted, then users assigned to this role will not be able to see any data for this index."
                />
              ) : (
                undefined
              )
            }
          >
            <Fragment>
              <EuiComboBox
                data-test-subj={`fieldInput${this.props.formIndex}`}
                options={availableFields ? availableFields.map(toOption) : []}
                selectedOptions={grant.map(toOption)}
                onCreateOption={this.onCreateGrantedField}
                onChange={this.onGrantedFieldsChange}
                isDisabled={this.props.isReservedRole}
              />
            </Fragment>
          </EuiFormRow>
        </EuiFlexItem>
      );
    }

    return null;
  };

  public getGrantedDocumentsControl = () => {
    const { allowDocumentLevelSecurity, indexPrivilege } = this.props;

    if (!allowDocumentLevelSecurity) {
      return null;
    }

    return (
      // @ts-ignore
      <EuiFlexGroup direction="column">
        {!this.props.isReservedRole && (
          <EuiFlexItem>
            <EuiSwitch
              data-test-subj={`restrictDocumentsQuery${this.props.formIndex}`}
              label={
                <FormattedMessage
                  id="xpack.security.management.editRoles.indexPrivilegeForm.grantReadPrivilegesLabel"
                  defaultMessage="Grant read privileges to specific documents"
                />
              }
              // @ts-ignore
              compressed={true}
              checked={this.state.queryExpanded}
              onChange={this.toggleDocumentQuery}
            />
          </EuiFlexItem>
        )}
        {this.state.queryExpanded && (
          <EuiFlexItem>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.security.management.editRoles.indexPrivilegeForm.grantedDocumentsQueryFormRowLabel"
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
                readOnly={this.props.isReservedRole}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  };

  public toggleDocumentQuery = () => {
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

  public onCreateIndexPatternOption = (option: any) => {
    const newIndexPatterns = this.props.indexPrivilege.names.concat([option]);

    this.props.onChange({
      ...this.props.indexPrivilege,
      names: newIndexPatterns,
    });
  };

  public onIndexPatternsChange = (newPatterns: EuiComboBoxOptionProps[]) => {
    this.props.onChange({
      ...this.props.indexPrivilege,
      names: newPatterns.map(fromOption),
    });
  };

  public onPrivilegeChange = (newPrivileges: EuiComboBoxOptionProps[]) => {
    this.props.onChange({
      ...this.props.indexPrivilege,
      privileges: newPrivileges.map(fromOption),
    });
  };

  public onQueryChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    this.props.onChange({
      ...this.props.indexPrivilege,
      query: e.target.value,
    });
  };

  public onCreateGrantedField = (grant: string) => {
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

  public onGrantedFieldsChange = (grantedFields: EuiComboBoxOptionProps[]) => {
    this.props.onChange({
      ...this.props.indexPrivilege,
      field_security: {
        ...this.props.indexPrivilege.field_security,
        grant: grantedFields.map(fromOption),
      },
    });
  };
}
