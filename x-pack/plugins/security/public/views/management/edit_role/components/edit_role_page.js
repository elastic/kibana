/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { difference, get } from 'lodash';
import { Notifier, toastNotifications } from 'ui/notify';
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
  EuiTitle,
} from '@elastic/eui';
import { PageHeader } from './page_header';
import { IndexPrivilegeForm } from './index_privilege_form';
import { ClusterPrivileges } from './cluster_privileges';
import { getFields, saveRole, deleteRole } from '../../../../objects';
import { isReservedRole } from '../lib/is_reserved_role';
import { RoleValidator } from '../lib/validate_role';
import { ReservedRoleBadge } from './reserved_role_badge';
import { ROLES_PATH } from '../../management_urls';
import { DeleteRoleButton } from './delete_role_button';

const notifier = new Notifier();

export class EditRolePage extends Component {
  static propTypes = {
    role: PropTypes.object.isRequired,
    runAsUsers: PropTypes.array.isRequired,
    indexPatterns: PropTypes.array.isRequired,
    httpClient: PropTypes.func.isRequired,
    rbacEnabled: PropTypes.bool.isRequired,
    spacesEnabled: PropTypes.bool.isRequired,
    allowDocumentLevelSecurity: PropTypes.bool.isRequired,
    allowFieldLevelSecurity: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      role: props.role,
      availableFields: {},
      formError: null
    };
    this.validator = new RoleValidator({ shouldValidate: false });
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
    const {
      validator
    } = this;

    return (
      <EuiPage>
        <PageHeader breadcrumbs={this.props.breadcrumbs} />
        <EuiPageContent>
          <EuiForm {...this.state.formError}>
            <EuiFlexGroup justifyContent={'spaceBetween'}>
              <EuiFlexItem grow={false}>
                <EuiText><h1>{this.getTitle()}</h1></EuiText>
              </EuiFlexItem>
              {this.getActionButton()}
            </EuiFlexGroup>

            <EuiSpacer />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow label={'Name'} {...validator.validateRoleName(this.state.role)}>
                  <EuiFieldText
                    name={'name'}
                    value={this.state.role.name || ''}
                    onChange={this.onNameChange}
                    readOnly={isReservedRole(this.props.role) || this.editingExistingRole()}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <ReservedRoleBadge role={this.props.role} />
            </EuiFlexGroup>

            <EuiSpacer />

            {this.getElasticsearchPrivileges()}

            {this.getKibanaPrivileges()}

            <EuiSpacer size={'xl'} />

            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={this.saveRole} disabled={isReservedRole(this.props.role)}>Save</EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={this.backToRoleList}>
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
          <DeleteRoleButton canDelete={true} onDelete={this.handleDeleteRole} />
        </EuiFlexItem>
      );
    }

    return null;
  };

  onNameChange = (e) => {
    const rawValue = e.target.value;
    const name = rawValue.replace(/\s/g, '-');

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
        <EuiTitle>
          <h3>Elasticsearch</h3>
        </EuiTitle>

        <EuiSpacer />

        <EuiPanel>
          <EuiAccordion
            id={'clusterPrivilegesAccordion'}
            buttonContent={<div><EuiIcon type={'logoElastic'} size={'m'} /> Cluster Privileges ({role.cluster.length})</div>}
          >
            <ClusterPrivileges role={this.state.role} onChange={this.onClusterPrivilegesChange} />
          </EuiAccordion>
        </EuiPanel>
        <EuiSpacer />

        <EuiPanel>
          <EuiAccordion
            id={'indexPrivilegesAccordion'}
            buttonContent={
              <div>
                <EuiIcon type={'indexSettings'} size={'m'} /> Index Privileges (
                {role.indices.filter(i => i.names.length).length})
              </div>
            }
          >
            <EuiText>
              <p>
                Index Privileges allow you to foo the bar while baring the baz
              </p>
            </EuiText>
            <EuiSpacer />
            {this.getIndexPrivileges()}
          </EuiAccordion>
        </EuiPanel>
        <EuiSpacer />

        <EuiPanel>
          <EuiAccordion
            id={'runAsPrivilegesAccordion'}
            buttonContent={<div><EuiIcon type={'play'} size={'m'} /> Run As Privileges ({role.run_as.length})</div>}
          >
            <EuiText>
              <p>
                Run As Privileges allow you to foo the bar while baring the baz
              </p>
            </EuiText>
            <EuiSpacer />
            <EuiComboBox
              placeholder={'Add a user...'}
              options={this.props.runAsUsers.map(username => ({ id: username, label: username }))}
              selectedOptions={this.state.role.run_as.map(u => ({ label: u }))}
              onChange={this.onRunAsUserChange}
              isDisabled={isReservedRole(this.props.role)}
            />
          </EuiAccordion>
        </EuiPanel>
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
        validator={this.validator}
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

  onIndexPrivilegeDelete = (privilegeIndex) => {
    return () => {
      const { role } = this.state;

      const newIndicesState = [...role.indices];
      newIndicesState.splice(privilegeIndex, 1);

      this.setState({
        role: {
          ...role,
          indices: newIndicesState
        }
      });
    };
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
            buttonContent={<div><EuiIcon type={'logoElastic'} size={'m'} /> Cluster Privileges</div>}
          >
            <EuiSpacer />
            <ClusterPrivileges role={{}} onChange={() => { }} />
          </EuiAccordion>
        </EuiFormRow>
      </Fragment>
    );
  };

  editingExistingRole = () => {
    return !!this.props.role.name;
  };

  isPlaceholderPrivilege = (indexPrivilege) => {
    return indexPrivilege.names.length === 0;
  };

  saveRole = () => {
    this.validator.enableValidation();

    const result = this.validator.validateForSave(this.state.role);
    if (result.isInvalid) {
      this.setState({
        formError: result
      });
    } else {
      this.setState({
        formError: null
      });

      const {
        httpClient,
      } = this.props;

      const role = {
        ...this.state.role
      };

      role.indices = role.indices.filter(i => !this.isPlaceholderPrivilege(i));

      saveRole(httpClient, role)
        .then(() => {
          toastNotifications.addSuccess('Saved role');
          this.backToRoleList();
        })
        .catch(error => {
          notifier.error(get(error, 'data.message'));
        });
    }
  };

  handleDeleteRole = () => {
    const {
      httpClient,
      role,
    } = this.props;

    deleteRole(httpClient, role.name)
      .then(() => {
        toastNotifications.addSuccess('Deleted role');
        this.backToRoleList();
      })
      .catch(error => {
        notifier.error(get(error, 'data.message'));
      });
  };

  backToRoleList = () => {
    window.location.hash = ROLES_PATH;
  };
}
