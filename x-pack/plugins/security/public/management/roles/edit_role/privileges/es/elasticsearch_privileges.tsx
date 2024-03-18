/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { Component, Fragment } from 'react';

import type { DocLinksStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Cluster } from '@kbn/remote-clusters-plugin/public';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { ClusterPrivileges } from './cluster_privileges';
import { IndexPrivileges } from './index_privileges';
import type { BuiltinESPrivileges, Role, SecurityLicense } from '../../../../../../common';
import type { IndicesAPIClient } from '../../../indices_api_client';
import { CollapsiblePanel } from '../../collapsible_panel';
import type { RoleValidator } from '../../validate_role';

interface Props {
  role: Role;
  editable: boolean;
  indicesAPIClient: PublicMethodsOf<IndicesAPIClient>;
  docLinks: DocLinksStart;
  license: SecurityLicense;
  onChange: (role: Role) => void;
  runAsUsers: string[];
  validator: RoleValidator;
  builtinESPrivileges: BuiltinESPrivileges;
  indexPatterns: string[];
  remoteClusters?: Cluster[];
  canUseRemoteIndices?: boolean;
  isDarkMode?: boolean;
}

export class ElasticsearchPrivileges extends Component<Props, {}> {
  public render() {
    return (
      <CollapsiblePanel iconType={'logoElasticsearch'} title={'Elasticsearch'}>
        {this.getForm()}
      </CollapsiblePanel>
    );
  }

  public getForm = () => {
    const {
      role,
      indicesAPIClient,
      docLinks,
      validator,
      onChange,
      editable,
      indexPatterns,
      remoteClusters,
      license,
      builtinESPrivileges,
      canUseRemoteIndices,
    } = this.props;

    return (
      <Fragment>
        <EuiDescribedFormGroup
          title={
            <h3>
              <FormattedMessage
                id="xpack.security.management.editRole.elasticSearchPrivileges.clusterPrivilegesTitle"
                defaultMessage="Cluster privileges"
              />
            </h3>
          }
          description={
            <p>
              <FormattedMessage
                id="xpack.security.management.editRole.elasticSearchPrivileges.manageRoleActionsDescription"
                defaultMessage="Manage the actions this role can perform against your cluster. "
              />
              {this.learnMore(docLinks.links.security.clusterPrivileges)}
            </p>
          }
        >
          <EuiFormRow fullWidth={true} hasEmptyLabelSpace>
            <ClusterPrivileges
              role={this.props.role}
              onChange={this.onClusterPrivilegesChange}
              builtinClusterPrivileges={builtinESPrivileges.cluster}
              editable={editable}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>

        <EuiSpacer />

        <EuiDescribedFormGroup
          title={
            <h3>
              <FormattedMessage
                id="xpack.security.management.editRole.elasticSearchPrivileges.runAsPrivilegesTitle"
                defaultMessage="Run As privileges"
              />
            </h3>
          }
          description={
            <p>
              <FormattedMessage
                id="xpack.security.management.editRole.elasticSearchPrivileges.howToBeSubmittedOnBehalfOfOtherUsersDescription"
                defaultMessage="Allow requests to be submitted on the behalf of other users. "
              />
              {this.learnMore(docLinks.links.security.runAsPrivilege)}
            </p>
          }
        >
          <EuiComboBox
            aria-label={i18n.translate(
              'xpack.security.management.editRole.elasticSearchPrivileges.runAsPrivilegesAriaLabel',
              { defaultMessage: 'Run as privileges' }
            )}
            placeholder={
              this.props.editable
                ? i18n.translate(
                    'xpack.security.management.editRole.elasticSearchPrivileges.addUserTitle',
                    { defaultMessage: 'Add a user…' }
                  )
                : undefined
            }
            options={this.props.runAsUsers.map((username) => ({
              label: username,
              isGroupLabelOption: false,
            }))}
            selectedOptions={this.props.role.elasticsearch.run_as.map((u) => ({ label: u }))}
            onCreateOption={this.onCreateRunAsOption}
            onChange={this.onRunAsUserChange}
            isDisabled={!editable}
          />
        </EuiDescribedFormGroup>
        <EuiSpacer />

        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.security.management.editRole.elasticSearchPrivileges.indexPrivilegesTitle"
              defaultMessage="Index privileges"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.security.management.editRole.elasticSearchPrivileges.controlAccessToClusterDataDescription"
              defaultMessage="Control access to the data in your cluster. "
            />
            {this.learnMore(docLinks.links.security.indicesPrivileges)}
          </p>
        </EuiText>
        <IndexPrivileges
          indexType="indices"
          indexPatterns={indexPatterns}
          role={role}
          indicesAPIClient={indicesAPIClient}
          validator={validator}
          license={license}
          onChange={onChange}
          availableIndexPrivileges={builtinESPrivileges.index}
          editable={editable}
          isDarkMode={this.props.isDarkMode}
        />

        {canUseRemoteIndices && (
          <>
            <EuiSpacer />
            <EuiSpacer />

            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.security.management.editRole.elasticSearchPrivileges.remoteIndexPrivilegesTitle"
                  defaultMessage="Remote index privileges"
                />
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.security.management.editRole.elasticSearchPrivileges.controlAccessToRemoteClusterDataDescription"
                  defaultMessage="Control access to the data in remote clusters. "
                />
                {this.learnMore(docLinks.links.security.indicesPrivileges)}
              </p>
            </EuiText>
            <IndexPrivileges
              indexType="remote_indices"
              remoteClusters={remoteClusters}
              role={role}
              indicesAPIClient={indicesAPIClient}
              validator={validator}
              license={license}
              onChange={onChange}
              availableIndexPrivileges={builtinESPrivileges.index}
              editable={editable}
              isDarkMode={this.props.isDarkMode}
            />
          </>
        )}
      </Fragment>
    );
  };

  public learnMore = (href: string) => (
    <EuiLink className="editRole__learnMore" href={href} target={'_blank'}>
      <FormattedMessage
        id="xpack.security.management.editRole.elasticSearchPrivileges.learnMoreLinkText"
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

  public onCreateRunAsOption = (option: any) => {
    const newRunAsUsers = this.props.role.elasticsearch.run_as.concat(option);

    const role = {
      ...this.props.role,
      elasticsearch: {
        ...this.props.role.elasticsearch,
        run_as: newRunAsUsers,
      },
    };
    this.props.onChange(role);
  };
}
