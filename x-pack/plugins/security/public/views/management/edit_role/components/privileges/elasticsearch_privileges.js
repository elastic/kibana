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
  EuiComboBox,
  EuiFormRow,
  EuiButton,
  EuiDescribedFormGroup,
  EuiTitle,
  EuiHorizontalRule,
  EuiLink,
} from '@elastic/eui';
import './elasticsearch_privileges.less';
import { ClusterPrivileges } from './cluster_privileges';
import { IndexPrivileges } from './index_privileges';
import { CollapsiblePanel } from '../collapsible_panel';
import { documentationLinks } from '../../../../../documentation_links';

export class ElasticsearchPrivileges extends Component {
  static propTypes = {
    role: PropTypes.object.isRequired,
    editable: PropTypes.bool.isRequired,
    httpClient: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    runAsUsers: PropTypes.array.isRequired,
    validator: PropTypes.object.isRequired,
    indexPatterns: PropTypes.array.isRequired,
    allowDocumentLevelSecurity: PropTypes.bool.isRequired,
    allowFieldLevelSecurity: PropTypes.bool.isRequired,
  };

  render() {
    return (
      <CollapsiblePanel iconType={'logoElasticsearch'} title={'Elasticsearch'}>
        {this.getForm()}
      </CollapsiblePanel>
    );
  }

  getForm = () => {
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
        <EuiDescribedFormGroup
          title={<h3>Cluster privileges</h3>}
          description={
            <p>
              Manage the actions this role can perform against your cluster. {this.learnMore(documentationLinks.esClusterPrivileges)}
            </p>
          }
        >
          <EuiFormRow fullWidth={true} hasEmptyLabelSpace>
            <ClusterPrivileges role={this.props.role} onChange={this.onClusterPrivilegesChange} />
          </EuiFormRow>
        </EuiDescribedFormGroup>

        <EuiSpacer />

        <EuiDescribedFormGroup
          title={<h3>Run As privileges</h3>}
          description={
            <p>
              Allow requests to be submitted on the behalf of other users. {this.learnMore(documentationLinks.esRunAsPrivileges)}
            </p>
          }
        >
          <EuiFormRow hasEmptyLabelSpace>
            <EuiComboBox
              placeholder={this.props.editable ? 'Add a user...' : null}
              options={this.props.runAsUsers.map(username => ({ id: username, label: username }))}
              selectedOptions={this.props.role.run_as.map(u => ({ label: u }))}
              onChange={this.onRunAsUserChange}
              isDisabled={!this.props.editable}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>

        <EuiSpacer />

        <EuiTitle size={'xs'}><h3>Index privileges</h3></EuiTitle>
        <EuiSpacer size={'s'} />
        <EuiText size={'s'} color={'subdued'}>
          <p>Control access to the data in your cluster. {this.learnMore(documentationLinks.esIndicesPrivileges)}</p>
        </EuiText>

        <IndexPrivileges {...indexProps} />

        <EuiHorizontalRule />

        {this.props.editable && (
          <EuiButton size={'s'} iconType={'plusInCircle'} onClick={this.addIndexPrivilege}>Add index privilege</EuiButton>
        )}
      </Fragment>
    );
  }

  learnMore = (href) => (
    <EuiLink className="editRole__learnMore" href={href} target={'_blank'}>
      Learn more
    </EuiLink>
  );

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
