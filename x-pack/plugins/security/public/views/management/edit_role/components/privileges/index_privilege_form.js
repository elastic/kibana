/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiCallOut,
  EuiComboBox,
  EuiTextArea,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
  EuiHorizontalRule,
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

  render() {
    return (
      <div>
        <EuiFlexGroup className="index-privilege-form">
          <EuiFlexItem>
            {this.getPrivilegeForm()}
          </EuiFlexItem>
          {this.props.allowDelete && (
            <EuiFlexItem grow={false}>
              <EuiButton
                size={'s'}
                color={'danger'}
                iconType={'trash'}
                onClick={this.props.onDelete}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiHorizontalRule />
      </div>
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
        </EuiFlexGroup>

        {this.getConditionalFeatures()}
      </Fragment>
    );
  };

  getConditionalFeatures = () => {
    const {
      allowDocumentLevelSecurity,
      allowFieldLevelSecurity,
      indexPrivilege,
      availableFields,
    } = this.props;

    if (!allowFieldLevelSecurity && !allowDocumentLevelSecurity) {
      return null;
    }

    const features = [];
    if (allowDocumentLevelSecurity) {
      features.push((
        <EuiFlexItem key={0}>
          <EuiFormRow label={'Granted Documents Query (optional)'} fullWidth={true}>
            <EuiTextArea
              rows={1}
              value={indexPrivilege.query}
              onChange={this.onQueryChange}
              readOnly={this.props.isReservedRole}
            />
          </EuiFormRow>
        </EuiFlexItem>
      ));
    }

    let grantedFieldsWarning = null;

    if (allowFieldLevelSecurity) {

      const { grant = [] } = indexPrivilege.field_security || {};

      if (grant.length === 0) {
        grantedFieldsWarning = (
          <Fragment>
            <EuiSpacer />
            <EuiCallOut title={'No Granted Fields'} size="s" color="warning" iconType="help">
              <p>
                If no fields are granted, then users assigned to this role will not be able to
                see any data for this index. Is this really what you want?
              </p>
            </EuiCallOut>
          </Fragment>
        );
      }

      features.push((
        <EuiFlexItem key={1}>
          <EuiFormRow label={'Granted Fields (optional)'} fullWidth={true} >
            <Fragment>
              <EuiComboBox
                options={availableFields ? availableFields.map(toOption) : []}
                selectedOptions={grant.map(toOption)}
                onCreateOption={this.onCreateGrantedField}
                onChange={this.onGrantedFieldsChange}
                isDisabled={this.props.isReservedRole}
              />
              {grantedFieldsWarning}
            </Fragment>
          </EuiFormRow>
        </EuiFlexItem>
      ));
    }

    return (
      <Fragment>
        <EuiSpacer />
        <EuiFlexGroup>
          {features}
        </EuiFlexGroup>
      </Fragment>
    );
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
