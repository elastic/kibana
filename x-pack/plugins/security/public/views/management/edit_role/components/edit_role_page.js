/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { difference } from 'lodash';
import {
  EuiText,
  EuiSpacer,
  EuiIcon,
  EuiAccordion,
  EuiComboBox,
  EuiPage,
  EuiPageContent,
  EuiPanel,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiBadge,
} from '@elastic/eui';
import { PageHeader } from './page_header';
import { IndexPrivilegeForm } from './index_privilege_form';
import { ClusterPrivileges } from './cluster_privileges';
import { getFields } from '../../../../objects';
import { isReservedRole } from '../lib/is_reserved_role';

export class EditRolePage extends Component {
  static propTypes = {
    role: PropTypes.object.isRequired,
    runAsUsers: PropTypes.array.isRequired,
    indexPatterns: PropTypes.array.isRequired,
    httpClient: PropTypes.func.isRequired,
    rbacEnabled: PropTypes.bool.isRequired,
    spacesEnabled: PropTypes.bool.isRequired,
    allowDocumentLevelSecurity: PropTypes.bool.isRequired,
    allowFieldLevelSecurity: PropTypes.bool.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      role: props.role,
      availableFields: {}
    };
  }

  componentDidMount() {
    this.loadAvailableFields(this.state.role.indices);
  }

  loadAvailableFields(indices) {
    const patterns = indices.map(index => index.names.join(','));

    const cachedPatterns = Object.keys(this.state.availableFields);
    const patternsToFetch = difference(patterns, cachedPatterns);

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

  render() {
    return (
      <EuiPage>
        <PageHeader breadcrumbs={this.props.breadcrumbs}/>
        <EuiPageContent>
          <EuiForm>
            <EuiFlexGroup justifyContent={'spaceBetween'}>
              <EuiFlexItem grow={false}>
                <EuiText><h1>{this.getTitle()}</h1></EuiText>
              </EuiFlexItem>
              {this.getActionButton()}
            </EuiFlexGroup>

            <EuiSpacer/>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow label={'Name'}>
                  <EuiFieldText
                    name={'name'}
                    value={this.state.role.name}
                    onChange={this.onNameChange}
                    readOnly={isReservedRole(this.props.role)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              {isReservedRole(this.props.role)
                && <EuiFlexItem grow={false}><EuiBadge iconType={'lock'}>Reserved Role</EuiBadge></EuiFlexItem>}
            </EuiFlexGroup>

            <EuiSpacer/>

            {this.getElasticsearchPrivileges()}

            {this.getKibanaPrivileges()}

            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={this.saveSpace} disabled={isReservedRole(this.props.role)}>Save</EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={this.backToSpacesList}>
                  Cancel
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiForm>
        </EuiPageContent>
      </EuiPage>
    );
  }

  getTitle = () => {
    if (this.editingExistingRole()) {
      return `Edit role`;
    }
    return `New Role`;
  };

  getActionButton = () => {
    if (this.editingExistingRole() && !isReservedRole(this.props.role)) {
      return (
        <EuiFlexItem grow={false}>
          <EuiButton size={'s'} color={'danger'} iconType={'trash'}>Delete role</EuiButton>
        </EuiFlexItem>
      );
    }

    return null;
  };

  onNameChange = (name) => {
    this.setState({
      role: {
        ...this.state.role,
        name
      }
    });
  }

  getElasticsearchPrivileges = () => {
    const {
      role
    } = this.state;

    return (
      <Fragment>
        <EuiFormRow label={'Elasticsearch'} fullWidth={true}>
          <EuiAccordion
            id={'clusterPrivilegesAccordion'}
            buttonContent={<div><EuiIcon type={'logoElastic'} size={'m'}/> Cluster Privileges ({role.cluster.length})</div>}
          >
            <EuiPanel>
              <ClusterPrivileges role={this.state.role} onChange={this.onClusterPrivilegesChange}/>
            </EuiPanel>
          </EuiAccordion>
        </EuiFormRow>
        <EuiFormRow fullWidth={true}>
          <EuiAccordion
            id={'indexPrivilegesAccordion'}
            buttonContent={
              <div>
                <EuiIcon type={'indexSettings'} size={'m'}/> Index Privileges (
                {role.indices.filter(i => i.names.length).length})
              </div>
            }
          >
            <EuiPanel>
              <EuiText>
                <p>
                  Index Privileges allow you to foo the bar while baring the baz
                </p>
              </EuiText>
              <EuiSpacer/>
              {this.getIndexPrivileges()}
            </EuiPanel>
          </EuiAccordion>
        </EuiFormRow>

        <EuiFormRow fullWidth={true}>
          <EuiAccordion
            id={'runAsPrivilegesAccordion'}
            buttonContent={<div><EuiIcon type={'play'} size={'m'}/> Run As Privileges ({role.run_as.length})</div>}
          >
            <EuiPanel>
              <EuiComboBox
                placeholder={'Add a user...'}
                options={this.props.runAsUsers.map(username => ({ id: username, label: username }))}
                selectedOptions={this.state.role.run_as.map(u => ({ label: u }))}
                onChange={this.onRunAsUserChange}
              />
            </EuiPanel>
          </EuiAccordion>
        </EuiFormRow>
      </Fragment>
    );
  };

  getIndexPrivileges = () => {
    const { indices = [] } = this.state.role;

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
        indexPrivilege={indexPrivilege}
        availableFields={this.state.availableFields[indexPrivilege.names.join(',')]}
        onChange={this.onIndexPrivilegeChange(idx)}
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
  };

  addIndexPrivilege = () => {
    const { role } = this.state;

    this.setState({
      role: {
        ...role,
        indices: [...role.indices, {
          names: [],
          privileges: [],
          field_security: {
            grant: ['*']
          }
        }]
      }
    });
  };

  onIndexPrivilegeChange = (index) => {
    return (updatedPrivilege) => {
      const { role } = this.state;
      const { indices } = role;

      const newIndicesState = [...indices];
      newIndicesState[index] = updatedPrivilege;

      this.setState({
        role: {
          ...role,
          indices: newIndicesState
        }
      });

      this.loadAvailableFields(newIndicesState);
    };
  };

  deleteIndexPrivilege = (privilegeIndex) => {
    this.setState({
      role: {
        ...this.state.role,
        indices: this.state.indices.splice(privilegeIndex, 1)
      }
    });
  }

  onClusterPrivilegesChange = (cluster) => {
    this.setState({
      role: {
        ...this.state.role,
        cluster
      }
    });
  }

  onRunAsUserChange = (users) => {
    this.setState({
      role: {
        ...this.state.role,
        run_as: users.map(u => u.label)
      }
    });
  }

  getKibanaPrivileges = () => {
    if (!this.props.kibanaPrivilegesEnabled) {
      return null;
    }

    return (
      <Fragment>
        <EuiFormRow label={'Kibana'}>
          <EuiAccordion
            id={'kibanaPrivilegesAccordion'}
            buttonContent={<div><EuiIcon type={'logoElastic'} size={'m'}/> Cluster Privileges</div>}
          >
            <EuiSpacer/>
            <ClusterPrivileges role={{}} onChange={() => { }}/>
          </EuiAccordion>
        </EuiFormRow>
      </Fragment>
    );
  };

  editingExistingRole = () => {
    return !!this.props.role.name;
  };
}
