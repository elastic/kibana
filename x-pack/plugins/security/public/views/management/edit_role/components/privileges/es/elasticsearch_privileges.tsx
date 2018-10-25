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
import { FormattedMessage, I18nProvider, injectI18n } from '@kbn/i18n/react';
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
  intl: any;
}

export class ElasticsearchPrivilegesUI extends Component<Props, {}> {
  public render() {
    return (
      <I18nProvider>
        <CollapsiblePanel iconType={'logoElasticsearch'} title={'Elasticsearch'}>
          {this.getForm()}
        </CollapsiblePanel>
      </I18nProvider>
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
      intl,
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
          title={
            <h3>
              <FormattedMessage
                id="xpack.security.views.management.editRoles.components.privileges.es.elasticSearchPrivileges.clusterPrivilegesTitle"
                defaultMessage="Cluster privileges"
              />
            </h3>
          }
          description={
            <p>
              <FormattedMessage
                id="xpack.security.views.management.editRoles.components.privileges.es.elasticSearchPrivileges.manageRoleActionsDescription"
                defaultMessage="Manage the actions this role can perform against your cluster. "
              />
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
          title={
            <h3>
              <FormattedMessage
                id="xpack.security.views.management.editRoles.components.privileges.es.elasticSearchPrivileges.runAsPrivilegesTitle"
                defaultMessage="Run As privileges"
              />
            </h3>
          }
          description={
            <p>
              <FormattedMessage
                id="xpack.security.views.management.editRoles.components.privileges.es.elasticSearchPrivileges.howToBeSubmittedOnBehalfOfOtherUsersDescription"
                defaultMessage="Allow requests to be submitted on the behalf of other users. "
              />
              {this.learnMore(documentationLinks.esRunAsPrivileges)}
            </p>
          }
        >
          <EuiFormRow hasEmptyLabelSpace>
            <EuiComboBox
              placeholder={
                this.props.editable
                  ? intl.formatMessage({
                      id:
                        'xpack.security.views.management.editRoles.components.privileges.es.elasticSearchPrivileges.addUserTitle',
                      defaultMessage: 'Add a user...',
                    })
                  : undefined
              }
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
          <h3>
            <FormattedMessage
              id="xpack.security.views.management.editRoles.components.privileges.es.elasticSearchPrivileges.indexPrivilegesTitle"
              defaultMessage="Index privileges"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size={'s'} />
        <EuiText size={'s'} color={'subdued'}>
          <p>
            <FormattedMessage
              id="xpack.security.views.management.editRoles.components.privileges.es.elasticSearchPrivileges.controlAccessToClusterDataDescription"
              defaultMessage="Control access to the data in your cluster. "
            />
            {this.learnMore(documentationLinks.esIndicesPrivileges)}
          </p>
        </EuiText>

        <IndexPrivileges {...indexProps} />

        <EuiHorizontalRule />

        {this.props.editable && (
          <EuiButton size={'s'} iconType={'plusInCircle'} onClick={this.addIndexPrivilege}>
            <FormattedMessage
              id="xpack.security.views.management.editRoles.components.privileges.es.elasticSearchPrivileges.addIndexPrivilegesButtonLabel"
              defaultMessage="Add index privilege"
            />
          </EuiButton>
        )}
      </Fragment>
    );
  };

  public learnMore = (href: string) => (
    <EuiLink className="editRole__learnMore" href={href} target={'_blank'}>
      <FormattedMessage
        id="xpack.security.views.management.editRoles.components.privileges.es.elasticSearchPrivileges.learnMoreLinkText"
        defaultMessage="Learn more"
      />
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

export const ElasticsearchPrivileges = injectI18n(ElasticsearchPrivilegesUI);
