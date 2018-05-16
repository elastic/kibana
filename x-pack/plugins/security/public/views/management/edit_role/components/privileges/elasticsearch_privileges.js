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
  EuiAccordion,
  EuiComboBox,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { isReservedRole } from '../../lib/is_reserved_role';
import { ClusterPrivileges } from './cluster_privileges';
import { IndexPrivileges } from './index_privileges';

export class ElasticsearchPrivileges extends Component {
  static propTypes = {
    role: PropTypes.object.isRequired,
    httpClient: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    runAsUsers: PropTypes.array.isRequired,
    validator: PropTypes.object.isRequired,
  };

  render() {
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
        <EuiTitle>
          <h3>Elasticsearch</h3>
        </EuiTitle>

        <EuiSpacer />

        <EuiPanel>
          <EuiAccordion
            id={'clusterPrivilegesAccordion'}
            buttonContent={<div><EuiIcon type={'logoElastic'} size={'m'} /> Cluster Privileges ({role.cluster.length})</div>}
          >
            <ClusterPrivileges role={this.props.role} onChange={this.onClusterPrivilegesChange} />
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

            <IndexPrivileges {...indexProps} />

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
              selectedOptions={this.props.role.run_as.map(u => ({ label: u }))}
              onChange={this.onRunAsUserChange}
              isDisabled={isReservedRole(this.props.role)}
            />
          </EuiAccordion>
        </EuiPanel>
      </Fragment>
    );
  }

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
