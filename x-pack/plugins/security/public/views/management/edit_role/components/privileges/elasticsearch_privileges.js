/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiText,
  EuiSpacer,
  EuiIcon,
  EuiComboBox,
  EuiPanel,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiDescribedFormGroup,
  EuiTitle,
  EuiHorizontalRule,
  EuiLink,
} from '@elastic/eui';
import { ClusterPrivileges } from './cluster_privileges';
import { IndexPrivileges } from './index_privileges';
import { isReservedRole } from '../../../../../lib/role';
import './elasticsearch_privileges.less';

export class ElasticsearchPrivileges extends Component {
  static propTypes = {
    role: PropTypes.object.isRequired,
    httpClient: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    runAsUsers: PropTypes.array.isRequired,
    validator: PropTypes.object.isRequired,
  };

  state = {
    collapsed: false
  };

  render() {


    return (
      <EuiPanel>
        {this.getTitle()}
        {this.getForm()}
      </EuiPanel>
    );
  }

  getTitle = () => {
    return (
      <EuiFlexGroup alignItems={'baseline'}>
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <div>
              <EuiIcon type={'logoElasticsearch'} size={'l'} className={'manageRoles__esLogo'} /> Elasticsearch&nbsp;
            </div>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink size={'s'} onClick={this.toggleCollapsed}>{this.state.collapsed ? 'show' : 'hide'}</EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  getForm = () => {
    if (this.state.collapsed) {
      return null;
    }

    const {
      role,
      httpClient,
      validator,
      onChange,
      indexPatterns,
      allowDocumentLevelSecurity,
      allowFieldLevelSecurity,
    } = this.props;

    const indexProps = {
      role,
      httpClient,
      validator,
      indexPatterns,
      allowDocumentLevelSecurity,
      allowFieldLevelSecurity,
      onChange,
    };

    return (
      <Fragment>
        <EuiSpacer />
        <EuiDescribedFormGroup
          title={<p>Cluster privileges</p>}
          description={
            <p>
              Manage the actions this role can perform against your cluster.
            </p>
          }
        >
          <EuiFormRow fullWidth={true}>
            <ClusterPrivileges role={this.props.role} onChange={this.onClusterPrivilegesChange} />
          </EuiFormRow>
        </EuiDescribedFormGroup>

        <EuiSpacer />

        <EuiDescribedFormGroup
          title={<p>Run As privileges</p>}
          description={
            <p>
              Allow requests to be submitted on behalf of other users.
            </p>
          }
        >
          <EuiFormRow>
            <EuiComboBox
              placeholder={'Add a user...'}
              options={this.props.runAsUsers.map(username => ({ id: username, label: username }))}
              selectedOptions={this.props.role.run_as.map(u => ({ label: u }))}
              onChange={this.onRunAsUserChange}
              isDisabled={isReservedRole(this.props.role)}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>

        <EuiSpacer />

        <EuiFormRow fullWidth={true}>
          <div>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiTitle size={'xs'}><p>Index privileges</p></EuiTitle>
                <EuiText size={'s'} color={'subdued'}><p>Control access to the data in your cluster.</p></EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton size={'s'} iconType={'plusInCircle'} onClick={this.addIndexPrivilege}>Add Index Privilege</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin={'xs'} />
          </div>
        </EuiFormRow>
        <EuiFormRow fullWidth={true}>
          <IndexPrivileges {...indexProps} />
        </EuiFormRow>
      </Fragment>
    );
  }

  toggleCollapsed = () => {
    this.setState({
      collapsed: !this.state.collapsed
    });
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

  onClusterPrivilegesChange = (cluster) => {
    const role = {
      ...this.props.role,
      cluster
    };

    this.props.onChange(role);
  }

  onRunAsUserChange = (users) => {
    const role = {
      ...this.props.role,
      run_as: users.map(u => u.label)
    };

    this.props.onChange(role);
  }
}
