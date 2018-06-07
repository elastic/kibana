/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiComboBox,
  EuiTextArea,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiSpacer,
  EuiHorizontalRule,
  EuiButtonIcon,
} from '@elastic/eui';
import { getIndexPrivileges } from '../../../../../services/role_privileges';

const fromOption = (option) => option.label;
const toOption = (value) => ({ label: value });

export class IndexPrivilegeForm extends Component {
  static propTypes = {
    indexPrivilege: PropTypes.object.isRequired,
    indexPatterns: PropTypes.array.isRequired,
    availableFields: PropTypes.array,
    onChange: PropTypes.func.isRequired,
    isReservedRole: PropTypes.bool.isRequired,
    allowDelete: PropTypes.bool.isRequired,
    allowDocumentLevelSecurity: PropTypes.bool.isRequired,
    allowFieldLevelSecurity: PropTypes.bool.isRequired,
    validator: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      queryExpanded: !!props.indexPrivilege.query,
      documentQuery: props.indexPrivilege.query
    };
  }

  render() {
    return (
      <Fragment>
        <EuiHorizontalRule />
        <EuiFlexGroup className="index-privilege-form">
          <EuiFlexItem>
            {this.getPrivilegeForm()}
          </EuiFlexItem>
          {this.props.allowDelete && (
            <EuiFlexItem grow={false}>
              <EuiFormRow hasEmptyLabelSpace>
                <EuiButtonIcon aria-label={'Delete index privilege'} color={'danger'} onClick={this.props.onDelete} iconType={'trash'} />
              </EuiFormRow>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </Fragment>
    );
  }

  getPrivilegeForm = () => {
    return (
      <Fragment>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label={'Indices'} fullWidth={true} {...this.props.validator.validateIndexPrivilege(this.props.indexPrivilege)}>
              <EuiComboBox
                options={this.props.indexPatterns.map(toOption)}
                selectedOptions={this.props.indexPrivilege.names.map(toOption)}
                onCreateOption={this.onCreateIndexPatternOption}
                onChange={this.onIndexPatternsChange}
                isDisabled={this.props.isReservedRole}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label={'Privileges'} fullWidth={true}>
              <EuiComboBox
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

  getGrantedFieldsControl = () => {
    const {
      allowFieldLevelSecurity,
      availableFields,
      indexPrivilege,
      isReservedRole,
    } = this.props;

    if (!allowFieldLevelSecurity) {
      return null;
    }

    const { grant = [] } = indexPrivilege.field_security || {};

    if (allowFieldLevelSecurity) {
      return (
        <EuiFlexItem>
          <EuiFormRow
            label={'Granted fields (optional)'}
            fullWidth={true}
            className="indexPrivilegeForm__grantedFieldsRow"
            helpText={
              !isReservedRole && grant.length === 0 ?
                'If no fields are granted, then users assigned to this role will not be able to see any data for this index.' : undefined
            }
          >
            <Fragment>
              <EuiComboBox
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
  }

  getGrantedDocumentsControl = () => {
    const {
      allowDocumentLevelSecurity,
      indexPrivilege,
    } = this.props;

    if (!allowDocumentLevelSecurity) {
      return null;
    }

    return (
      <EuiFlexGroup direction="column">
        {!this.props.isReservedRole &&
          <EuiFlexItem>
            <EuiSwitch
              label={'Restrict documents query'}
              compressed={true}
              value={this.state.queryExanded}
              onChange={this.toggleDocumentQuery}
            />
          </EuiFlexItem>
        }
        {this.state.queryExpanded &&
          <EuiFlexItem>
            <EuiFormRow label={'Granted documents query'} fullWidth={true}>
              <EuiTextArea
                style={{ resize: "none" }}
                fullWidth={true}
                value={indexPrivilege.query}
                onChange={this.onQueryChange}
                readOnly={this.props.isReservedRole}
              />
            </EuiFormRow>
          </EuiFlexItem>
        }
      </EuiFlexGroup>
    );
  };

  toggleDocumentQuery = () => {
    const willToggleOff = this.state.queryExanded;
    const willToggleOn = !willToggleOff;

    // If turning off, then save the current query in state so that we can restore it if the user changes their mind.
    this.setState({
      queryExpanded: !this.state.queryExpanded,
      documentQuery: willToggleOff ? this.props.indexPrivilege.query : this.state.documentQuery
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

  onCreateIndexPatternOption = (option) => {
    const newIndexPatterns = this.props.indexPrivilege.names.concat([option]);

    this.props.onChange({
      ...this.props.indexPrivilege,
      names: newIndexPatterns,
    });
  };

  onIndexPatternsChange = (newPatterns) => {
    this.props.onChange({
      ...this.props.indexPrivilege,
      names: newPatterns.map(fromOption),
    });
  };

  onPrivilegeChange = (newPrivileges) => {
    this.props.onChange({
      ...this.props.indexPrivilege,
      privileges: newPrivileges.map(fromOption),
    });
  };

  onQueryChange = (e) => {
    this.props.onChange({
      ...this.props.indexPrivilege,
      query: e.target.value,
    });
  };

  onCreateGrantedField = (grant) => {
    const newGrants = this.props.indexPrivilege.field_security.grant.concat([grant]);

    this.props.onChange({
      ...this.props.indexPrivilege,
      field_security: {
        ...this.props.indexPrivilege.field_security,
        grant: newGrants,
      },
    });
  };

  onGrantedFieldsChange = (grantedFields) => {
    this.props.onChange({
      ...this.props.indexPrivilege,
      field_security: {
        ...this.props.indexPrivilege.field_security,
        grant: grantedFields.map(fromOption),
      },
    });
  };
}
