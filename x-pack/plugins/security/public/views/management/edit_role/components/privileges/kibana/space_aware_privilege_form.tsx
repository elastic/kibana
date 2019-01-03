/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiInMemoryTable,
  // @ts-ignore
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import {
  EffectivePrivilegesFactory,
  PRIVILEGE_SOURCE,
} from 'plugins/security/lib/effective_privileges';
import React, { Component, Fragment } from 'react';
import { UICapabilities } from 'ui/capabilities';
import { PrivilegeDefinition } from 'x-pack/plugins/security/common/model/privileges/privilege_definition';
import { getSpaceColor } from 'x-pack/plugins/spaces/common';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { Space } from '../../../../../../../../spaces/common/model/space';
import { Role } from '../../../../../../../common/model/role';
import { copyRole } from '../../../lib/copy_role';
import { RoleValidator } from '../../../lib/validate_role';
import { NewPrivilegeSpaceForm } from './new_privilege_space_form';
import { PrivilegeMatrix } from './privilege_matrix';

interface Props {
  privilegeDefinition: PrivilegeDefinition;
  role: Role;
  effectivePrivilegesFactory: EffectivePrivilegesFactory;
  spaces: Space[];
  onChange: (role: Role) => void;
  editable: boolean;
  validator: RoleValidator;
  intl: InjectedIntl;
  uiCapabilities: UICapabilities;
  features: Feature[];
}

interface State {
  role: Role | null;
  editingIndex: number;
  showSpacePrivilegeEditor: boolean;
  showPrivilegeMatrix: boolean;
}

class SpaceAwarePrivilegeFormUI extends Component<Props, State> {
  private globalSpaceEntry: Space = {
    id: '*',
    name: '* (all spaces)',
    color: '#afafaf',
    initials: '*',
    disabledFeatures: [],
  };

  constructor(props: Props) {
    super(props);

    this.state = {
      showSpacePrivilegeEditor: false,
      showPrivilegeMatrix: false,
      role: null,
      editingIndex: -1,
    };
  }

  public render() {
    const { uiCapabilities, effectivePrivilegesFactory } = this.props;

    if (!uiCapabilities.spaces.manage) {
      return (
        <EuiCallOut
          title={
            <p>
              <FormattedMessage
                id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.insufficientPrivilegesDescription"
                defaultMessage="Insufficient Privileges"
              />
            </p>
          }
          iconType="alert"
          color="danger"
        >
          <p>
            <FormattedMessage
              id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.howToViewAllAvailableSpacesDescription"
              defaultMessage="You are not authorized to view all available spaces."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.ensureAccountHasAllPrivilegesGrantedDescription"
              defaultMessage="Please ensure your account has all privileges granted by the
              {kibanaUser} role, and try again."
              values={{
                kibanaUser: (
                  <strong>
                    <FormattedMessage
                      id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.kibanaUserTitle"
                      defaultMessage="kibana_user"
                    />
                  </strong>
                ),
              }}
            />
          </p>
        </EuiCallOut>
      );
    }

    let availableSpaces: Space[] = [];
    if (this.state.showSpacePrivilegeEditor) {
      availableSpaces = [...this.getAvailableSpaces()];
      if (this.state.editingIndex >= 0) {
        const form = this.props.role.kibana.spaces[this.state.editingIndex];

        const displaySpaces = this.getDisplaySpaces();
        const selectedSpaces = form.spaces
          .map(spaceId => displaySpaces.find(s => s.id === spaceId))
          .filter(Boolean) as Space[];

        availableSpaces.push(...selectedSpaces);
      }
    }

    return (
      <Fragment>
        {this.renderKibanaPrivileges()}
        {this.state.showSpacePrivilegeEditor && (
          <NewPrivilegeSpaceForm
            role={this.props.role}
            effectivePrivilegesFactory={effectivePrivilegesFactory}
            privilegeDefinition={this.props.privilegeDefinition}
            features={this.props.features}
            intl={this.props.intl}
            onChange={this.onSpacesPrivilegeChange}
            onCancel={this.onCancelEditPrivileges}
            spaces={availableSpaces}
            editingIndex={this.state.editingIndex}
          />
        )}
      </Fragment>
    );
  }

  private renderKibanaPrivileges = () => {
    const { role, effectivePrivilegesFactory } = this.props;

    const { global } = role.kibana;

    const globalPrivilege = this.locateGlobalPrivilege();

    const spacePrivileges = this.getSortedPrivileges();

    const displaySpaces = this.getDisplaySpaces();

    const effectivePrivileges = effectivePrivilegesFactory.getInstance(
      this.state.role || this.props.role
    );

    const items: any[] = [];
    if (global.minimum.length > 0 || Object.keys(global.feature).length > 0) {
      items.push({
        isGlobal: true,
        spaces: [
          {
            id: '*',
            name: 'Global (all spaces)',
            initials: '*',
            color: '#afafaf',
          },
        ],
        headerSpaces: [
          {
            id: '*',
            name: 'Global (all spaces)',
            initials: '*',
            color: '#afafaf',
          },
        ],
        privileges: {
          minimum: global.minimum,
          feature: global.feature,
        },
      });
    }

    spacePrivileges.forEach((spacePrivs, spacesIndex) => {
      items.push({
        spacesIndex,
        spaces: spacePrivs.spaces.map(spaceId => displaySpaces.find(space => space.id === spaceId)),
        headerSpaces: spacePrivs.spaces
          .filter((s, index, arr) => arr.length < 5 || index < 3)
          .map(spaceId => displaySpaces.find(space => space.id === spaceId)),
        privileges: {
          minimum: spacePrivs.minimum,
          feature: spacePrivs.feature,
        },
      });
    });

    interface TableRow {
      spaces: Space[];
      displaySpaces: Space[];
      spacesIndex: number;
      privileges: {
        minimum: string[];
        feature: {
          [featureId: string]: string[];
        };
      };
    }
    const rows: TableRow[] = spacePrivileges.map((spacePrivs, spacesIndex) => {
      const spaces = spacePrivs.spaces.map(spaceId =>
        displaySpaces.find(space => space.id === spaceId)
      ) as Space[];

      return {
        spaces,
        displaySpaces: spaces.filter((s, index, arr) => arr.length < 5 || index < 3),
        spacesIndex,
        privileges: {
          minimum: spacePrivs.minimum,
          feature: spacePrivs.feature,
        },
      };
    });

    const columns = [
      {
        field: 'displaySpaces',
        name: 'Spaces',
        width: '60%',
        render: (spaces: Space[], record: TableRow) => {
          return (
            <EuiFlexGroup wrap gutterSize={'s'}>
              {spaces.map((space: Space) => (
                <EuiFlexItem grow={false} key={space.id}>
                  <EuiBadge color={getSpaceColor(space)}>{space.name}</EuiBadge>
                </EuiFlexItem>
              ))}
              {record.spaces.length > spaces.length ? (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={
                      <ul>
                        {record.spaces.map(s => (
                          <li key={s.id}>{s.name}</li>
                        ))}
                      </ul>
                    }
                  >
                    <EuiText>({record.spaces.length - spaces.length} more)</EuiText>
                  </EuiToolTip>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'privileges',
        name: 'Privileges',
        render: (privileges: any, record: any) => {
          const actualPrivilege = effectivePrivileges.explainActualSpaceBasePrivilege(
            record.spacesIndex
          );

          const hasCustomizations = Object.keys(privileges.feature).length > 0;

          switch (actualPrivilege.source) {
            case PRIVILEGE_SOURCE.NONE:
            case PRIVILEGE_SOURCE.ASSIGNED_DIRECTLY:
              return (
                <EuiText>
                  {_.capitalize(hasCustomizations ? 'Custom' : actualPrivilege.privilege)}
                </EuiText>
              );
            case PRIVILEGE_SOURCE.EFFECTIVE:
              return (
                <EuiText>
                  {_.capitalize(hasCustomizations ? 'Custom' : actualPrivilege.privilege)}
                </EuiText>
              );
            case PRIVILEGE_SOURCE.EFFECTIVE_OVERRIDES_ASSIGNED:
              return (
                <EuiText>
                  {_.capitalize(hasCustomizations ? 'Custom' : actualPrivilege.privilege)}
                </EuiText>
              );
            default:
              return <EuiText color="danger">{'**unknown**'}</EuiText>;
          }
        },
      },
      {
        name: 'Actions',
        actions: [
          {
            description: 'Edit these privileges',
            icon: 'pencil',
            onClick: item => {
              this.setState({
                editingIndex: item.spacesIndex,
                showSpacePrivilegeEditor: true,
              });
            },
          },
          {
            description: 'Delete these privileges',
            icon: 'trash',
            color: 'danger',
            onClick: (item: TableRow) => {
              const roleCopy = copyRole(this.props.role);
              roleCopy.kibana.spaces.splice(item.spacesIndex, 1);
              this.props.onChange(roleCopy);
            },
          },
        ],
      },
    ];

    const table = <EuiInMemoryTable columns={columns} items={rows} />;

    if (items.length === 0) {
      return (
        <EuiEmptyPrompt
          iconType="lock"
          title={<h2>No access to Kibana</h2>}
          titleSize={'s'}
          body={
            <Fragment>
              <p>
                <FormattedMessage
                  id="foo"
                  defaultMessage="This role does not grant any access to Kibana."
                />
              </p>
            </Fragment>
          }
          actions={this.getAvailablePrivilegeButtons()}
        />
      );
    }

    return (
      <div>
        {table}
        {<EuiSpacer />}
        {this.getAvailablePrivilegeButtons()}
        <EuiSpacer />
        <EuiAccordion id="privilegeMatrix" buttonContent={'Show privilege matrix'}>
          <PrivilegeMatrix
            role={this.props.role}
            effectivePrivileges={this.props.effectivePrivilegesFactory.getInstance(this.props.role)}
            features={this.props.features}
            spaces={this.getDisplaySpaces()}
          />
        </EuiAccordion>
      </div>
    );
  };

  private getAvailablePrivilegeButtons = () => {
    const hasAvailableSpaces = this.getAvailableSpaces().length > 0;

    if (!hasAvailableSpaces) {
      return null;
    }

    return (
      <div>
        <EuiButton color="primary" onClick={this.addSpacePrivilege} iconType={'spacesApp'}>
          Add a privilege
        </EuiButton>
        <EuiSpacer size={'s'} />
        <EuiText color={'subdued'} size={'s'}>
          <FormattedMessage
            id="foo"
            defaultMessage="Customize by existing spaces or groups of existing spaces."
          />
        </EuiText>
      </div>
    );
  };

  private getDisplaySpaces = () => {
    return [this.globalSpaceEntry, ...this.props.spaces];
  };

  private getAvailableSpaces = () => {
    const { spaces: spacePrivileges } = this.props.role.kibana;

    const displaySpaces = this.getDisplaySpaces();

    const assignedSpaces: Space[] = _.uniq(spacePrivileges.flatMap(entry => entry.spaces))
      .map(spaceId => displaySpaces.find(s => s.id === spaceId))
      .filter(Boolean) as Space[];

    return _.difference([this.globalSpaceEntry, ...this.props.spaces], assignedSpaces) as Space[];
  };

  private locateGlobalPrivilege = () => {
    const { spaces: spacePrivileges } = this.props.role.kibana;
    return (
      spacePrivileges.find(privileges => privileges.spaces.includes('*')) || {
        spaces: ['*'],
        minimum: [],
        feature: {},
      }
    );
  };

  private getSortedPrivileges = () => {
    const { spaces: spacePrivileges } = this.props.role.kibana;
    return spacePrivileges.sort((priv1, priv2) => {
      return priv1.spaces.includes('*') ? -1 : priv1.spaces.includes('*') ? 1 : 0;
    });
  };

  private addSpacePrivilege = () => {
    this.setState({
      showSpacePrivilegeEditor: true,
      editingIndex: -1,
    });
  };

  private onSpacesPrivilegeChange = (role: Role) => {
    this.setState({ showSpacePrivilegeEditor: false, editingIndex: -1 });
    this.props.onChange(role);
  };

  private onCancelEditPrivileges = () => {
    this.setState({ showSpacePrivilegeEditor: false });
  };
}

export const SpaceAwarePrivilegeForm = injectI18n(SpaceAwarePrivilegeFormUI);
