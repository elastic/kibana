/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiComboBox,
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
<<<<<<< HEAD
=======
import { FormattedMessage, I18nProvider, InjectedIntl, injectI18n } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import React, { Component, Fragment } from 'react';
import { Role } from '../../../../../../../common/model/role';
// @ts-ignore
import { documentationLinks } from '../../../../../../documentation_links';
import { RoleValidator } from '../../../lib/validate_role';
import { CollapsiblePanel } from '../../collapsible_panel';
import { ClusterPrivileges } from './cluster_privileges';

import { IndexPrivileges } from './index_privileges';

interface Props {
  role: Role;
  editable: boolean;
  httpClient: any;
  onChange: (role: Role) => void;
  runAsUsers: string[];
  validator: RoleValidator;
  indexPatterns: string[];
  allowDocumentLevelSecurity: boolean;
  allowFieldLevelSecurity: boolean;
<<<<<<< HEAD
}

export class ElasticsearchPrivileges extends Component<Props, {}> {
  public render() {
    return (
      <CollapsiblePanel iconType={'logoElasticsearch'} title={'Elasticsearch'}>
        {this.getForm()}
      </CollapsiblePanel>
=======
  intl: InjectedIntl;
}

class ElasticsearchPrivilegesUI extends Component<Props, {}> {
  public render() {
    return (
      <I18nProvider>
        <CollapsiblePanel iconType={'logoElasticsearch'} title={'Elasticsearch'}>
          {this.getForm()}
        </CollapsiblePanel>
      </I18nProvider>
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    );
  }

  public getForm = () => {
    const {
      role,
      httpClient,
      validator,
      onChange,
      indexPatterns,
      allowDocumentLevelSecurity,
      allowFieldLevelSecurity,
<<<<<<< HEAD
=======
      intl,
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
          title={<h3>Cluster privileges</h3>}
          description={
            <p>
              Manage the actions this role can perform against your cluster.{' '}
=======
          title={
            <h3>
              <FormattedMessage
                id="xpack.security.management.editRoles.elasticSearchPrivileges.clusterPrivilegesTitle"
                defaultMessage="Cluster privileges"
              />
            </h3>
          }
          description={
            <p>
              <FormattedMessage
                id="xpack.security.management.editRoles.elasticSearchPrivileges.manageRoleActionsDescription"
                defaultMessage="Manage the actions this role can perform against your cluster. "
              />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
              {this.learnMore(documentationLinks.esClusterPrivileges)}
            </p>
          }
        >
          <EuiFormRow fullWidth={true} hasEmptyLabelSpace>
            <ClusterPrivileges role={this.props.role} onChange={this.onClusterPrivilegesChange} />
          </EuiFormRow>
        </EuiDescribedFormGroup>

        <EuiSpacer />

        <EuiDescribedFormGroup
<<<<<<< HEAD
          title={<h3>Run As privileges</h3>}
          description={
            <p>
              Allow requests to be submitted on the behalf of other users.{' '}
=======
          title={
            <h3>
              <FormattedMessage
                id="xpack.security.management.editRoles.elasticSearchPrivileges.runAsPrivilegesTitle"
                defaultMessage="Run As privileges"
              />
            </h3>
          }
          description={
            <p>
              <FormattedMessage
                id="xpack.security.management.editRoles.elasticSearchPrivileges.howToBeSubmittedOnBehalfOfOtherUsersDescription"
                defaultMessage="Allow requests to be submitted on the behalf of other users. "
              />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
              {this.learnMore(documentationLinks.esRunAsPrivileges)}
            </p>
          }
        >
          <EuiFormRow hasEmptyLabelSpace>
            <EuiComboBox
<<<<<<< HEAD
              placeholder={this.props.editable ? 'Add a user...' : undefined}
=======
              placeholder={
                this.props.editable
                  ? intl.formatMessage({
                      id:
                        'xpack.security.management.editRoles.elasticSearchPrivileges.addUserTitle',
                      defaultMessage: 'Add a user...',
                    })
                  : undefined
              }
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
              options={this.props.runAsUsers.map(username => ({
                id: username,
                label: username,
                isGroupLabelOption: false,
              }))}
              selectedOptions={this.props.role.elasticsearch.run_as.map(u => ({ label: u }))}
              onChange={this.onRunAsUserChange}
              isDisabled={!this.props.editable}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>

        <EuiSpacer />

        <EuiTitle size={'xs'}>
<<<<<<< HEAD
          <h3>Index privileges</h3>
=======
          <h3>
            <FormattedMessage
              id="xpack.security.management.editRoles.elasticSearchPrivileges.indexPrivilegesTitle"
              defaultMessage="Index privileges"
            />
          </h3>
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        </EuiTitle>
        <EuiSpacer size={'s'} />
        <EuiText size={'s'} color={'subdued'}>
          <p>
<<<<<<< HEAD
            Control access to the data in your cluster.{' '}
=======
            <FormattedMessage
              id="xpack.security.management.editRoles.elasticSearchPrivileges.controlAccessToClusterDataDescription"
              defaultMessage="Control access to the data in your cluster. "
            />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
            {this.learnMore(documentationLinks.esIndicesPrivileges)}
          </p>
        </EuiText>

        <IndexPrivileges {...indexProps} />

        <EuiHorizontalRule />

        {this.props.editable && (
          <EuiButton size={'s'} iconType={'plusInCircle'} onClick={this.addIndexPrivilege}>
<<<<<<< HEAD
            Add index privilege
=======
            <FormattedMessage
              id="xpack.security.management.editRoles.elasticSearchPrivileges.addIndexPrivilegesButtonLabel"
              defaultMessage="Add index privilege"
            />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
          </EuiButton>
        )}
      </Fragment>
    );
  };

  public learnMore = (href: string) => (
    <EuiLink className="editRole__learnMore" href={href} target={'_blank'}>
<<<<<<< HEAD
      Learn more
=======
      <FormattedMessage
        id="xpack.security.management.editRoles.elasticSearchPrivileges.learnMoreLinkText"
        defaultMessage="Learn more"
      />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    </EuiLink>
  );

  public addIndexPrivilege = () => {
    const { role } = this.props;

    const newIndices = [
      ...role.elasticsearch.indices,
      {
        names: [],
        privileges: [],
        field_security: {
          grant: ['*'],
        },
      },
    ];

    this.props.onChange({
      ...this.props.role,
      elasticsearch: {
        ...this.props.role.elasticsearch,
        indices: newIndices,
      },
    });
  };

  public onClusterPrivilegesChange = (cluster: string[]) => {
    const role = {
      ...this.props.role,
      elasticsearch: {
        ...this.props.role.elasticsearch,
        cluster,
      },
    };

    this.props.onChange(role);
  };

  public onRunAsUserChange = (users: any) => {
    const role = {
      ...this.props.role,
      elasticsearch: {
        ...this.props.role.elasticsearch,
        run_as: users.map((u: any) => u.label),
      },
    };

    this.props.onChange(role);
  };
}
<<<<<<< HEAD
=======

export const ElasticsearchPrivileges = injectI18n(ElasticsearchPrivilegesUI);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
