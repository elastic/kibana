/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { isReservedRole } from '../../../../../lib/role';
import { IndexPrivilegeForm } from './index_privilege_form';
import { getFields } from '../../../../../objects';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton
} from '@elastic/eui';

export class IndexPrivileges extends Component {
  static propTypes = {
    role: PropTypes.object.isRequired,
    indexPatterns: PropTypes.array.isRequired,
    allowDocumentLevelSecurity: PropTypes.bool.isRequired,
    allowFieldLevelSecurity: PropTypes.bool.isRequired,
    httpClient: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    validator: PropTypes.object.isRequired,
  }

  state = {
    availableFields: {}
  }

  componentDidMount() {
    this.loadAvailableFields(this.props.role.indices);
  }

  render() {
    const { indices = [] } = this.props.role;

    const {
      indexPatterns,
      allowDocumentLevelSecurity,
      allowFieldLevelSecurity
    } = this.props;

    const props = {
      indexPatterns,
      allowDocumentLevelSecurity,
      allowFieldLevelSecurity,
      isReservedRole: isReservedRole(this.props.role)
    };

    const forms = indices.map((indexPrivilege, idx) => (
      <IndexPrivilegeForm
        key={idx}
        {...props}
        validator={this.props.validator}
        allowDelete={!props.isReservedRole && !(this.isPlaceholderPrivilege(indexPrivilege) && indices.length === 1)}
        indexPrivilege={indexPrivilege}
        availableFields={this.state.availableFields[indexPrivilege.names.join(',')]}
        onChange={this.onIndexPrivilegeChange(idx)}
        onDelete={this.onIndexPrivilegeDelete(idx)}
      />
    ));

    const button = isReservedRole(this.props.role)
      ? null
      : (
        <EuiFlexGroup justifyContent={'flexEnd'}>
          <EuiFlexItem grow={false}>
            <EuiButton size={'s'} onClick={this.addIndexPrivilege} iconType={'plusInCircle'}>
              New Index Privilege
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      );

    return (
      <Fragment>
        {forms}
        {button}
      </Fragment>
    );
  }

  addIndexPrivilege = () => {
    const { role } = this.props;

    const newIndices = [...role.indices, {
      names: [],
      privileges: [],
      field_security: {
        grant: ['*']
      }
    }];

    this.props.onChange({
      ...this.props.role,
      indices: newIndices
    });
  };

  onIndexPrivilegeChange = (privilegeIndex) => {
    return (updatedPrivilege) => {
      const { role } = this.props;
      const { indices } = role;

      const newIndices = [...indices];
      newIndices[privilegeIndex] = updatedPrivilege;

      this.props.onChange({
        ...this.props.role,
        indices: newIndices
      });

      this.loadAvailableFields(newIndices);
    };
  };

  onIndexPrivilegeDelete = (privilegeIndex) => {
    return () => {
      const { role } = this.state;

      const newIndices = [...role.indices];
      newIndices.splice(privilegeIndex, 1);

      this.props.onChange({
        ...this.props.role,
        indices: newIndices
      });
    };
  }

  isPlaceholderPrivilege = (indexPrivilege) => {
    return indexPrivilege.names.length === 0;
  };

  loadAvailableFields(indices) {
    const patterns = indices.map(index => index.names.join(','));

    const cachedPatterns = Object.keys(this.state.availableFields);
    const patternsToFetch = _.difference(patterns, cachedPatterns);

    const fetchRequests = patternsToFetch.map(this.loadFieldsForPattern);

    Promise.all(fetchRequests)
      .then(response => {

        this.setState({
          availableFields: {
            ...this.state.availableFields,
            ...response.reduce((acc, o) => ({ ...acc, ...o }), {})
          }
        });
      });
  }

  loadFieldsForPattern = async (pattern) => {
    if (!pattern) return { [pattern]: [] };

    try {
      return {
        [pattern]: await getFields(this.props.httpClient, pattern)
      };

    } catch (e) {
      return {
        [pattern]: []
      };
    }
  }
}
