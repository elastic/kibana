/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiIcon,
  EuiIconTip,
  // @ts-ignore
  EuiInMemoryTable,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  // @ts-ignore
  EuiSuperSelect,
  EuiText,
  // @ts-ignore
  EuiToolTip,
} from '@elastic/eui';
import React, { Component, Fragment } from 'react';
import { Role } from 'x-pack/plugins/security/common/model/role';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { Space } from '../../../../../../../../../spaces/common/model/space';
import { SpaceAvatar } from '../../../../../../../../../spaces/public/components';
import {
  EffectivePrivileges,
  PRIVILEGE_SOURCE,
} from '../../../../../../../lib/effective_privileges';
import { PrivilegeDisplay, SupercededPrivilegeDisplay } from './privilege_display';

interface Props {
  role: Role;
  spaces: Space[];
  features: Feature[];
  effectivePrivileges: EffectivePrivileges;
}

interface State {
  showModal: boolean;
}

export class PrivilegeMatrix extends Component<Props, State> {
  public state = {
    showModal: false,
  };
  public render() {
    let modal = null;
    if (this.state.showModal) {
      modal = (
        <EuiOverlayMask>
          <EuiModal onClose={this.hideModal}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>Privilege summary matrix</EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>{this.renderTable()}</EuiModalBody>
            <EuiModalFooter>
              <EuiButton onClick={this.hideModal} fill>
                Close
              </EuiButton>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>
      );
    }

    return (
      <Fragment>
        <EuiButtonEmpty onClick={this.showModal}>Show privilege summary</EuiButtonEmpty>
        {modal}
      </Fragment>
    );
  }

  private renderTable = () => {
    const { role, features } = this.props;

    const { spaces: spacePrivileges = [] } = role.kibana;

    const globalPrivilege = this.locateGlobalPrivilege();

    const items: any[] = [];

    spacePrivileges.forEach((spacePrivs, spacesIndex) => {
      items.push({
        isGlobal: spacePrivs.spaces.includes('*'),
        spacesIndex,
        spaces: spacePrivs.spaces.map(spaceId =>
          this.props.spaces.find(space => space.id === spaceId)
        ),
        headerSpaces: spacePrivs.spaces
          .filter((s, index, arr) => arr.length < 5 || index < 3)
          .map(spaceId => this.props.spaces.find(space => space.id === spaceId)),
        privileges: {
          minimum: spacePrivs.minimum,
          feature: spacePrivs.feature,
        },
      });
    });

    interface TableRow {
      feature: Feature & { isBase: boolean };
      tooltip?: string;
      role: Role;
    }
    const rows: TableRow[] = [
      {
        feature: {
          id: '*base*',
          isBase: true,
          name: 'Base privilege',
          privileges: {},
        },
        tooltip: 'something goes here',
        role,
      },
      ...features.map(feature => ({
        feature: {
          ...feature,
          isBase: false,
        },
        role,
      })),
    ];

    const columns = [
      {
        field: 'feature',
        name: 'Feature',
        render: (feature: Feature & { isBase: boolean }) => {
          return feature.isBase ? (
            <Fragment>
              <strong>{feature.name}</strong>
              <EuiIconTip
                // TODO: Waiting on update from EUI
                // iconProps={{
                //   className: 'eui-alignTop',
                // }}
                type="questionInCircle"
                content="Lowest level privilege allowed"
                color="subdued"
              />
            </Fragment>
          ) : (
            <Fragment>
              {feature.icon && (
                <EuiIcon className="secPrivilegeFeatureIcon" size="m" type={feature.icon} />
              )}
              {feature.name}
            </Fragment>
          );
        },
      },
      ...items.map(item => {
        return {
          field: 'feature',
          name: (
            <Fragment>
              {item.headerSpaces.map((space: Space) => (
                <span key={space.id}>
                  <SpaceAvatar size="s" space={space} />{' '}
                  {item.isGlobal && (
                    <span>
                      Global <br />
                      (all spaces)
                    </span>
                  )}
                </span>
              ))}
              {item.headerSpaces.length !== item.spaces.length && (
                // @ts-ignore
                <EuiToolTip
                  content={
                    <EuiText size="s">
                      <ul>
                        {item.spaces.map((s: Space) => (
                          <li key={s.id}>{s.name}</li>
                        ))}
                      </ul>
                    </EuiText>
                  }
                >
                  {item.spaces.length - item.headerSpaces.length} more
                </EuiToolTip>
              )}
            </Fragment>
          ),
          render: (feature: Feature & { isBase: boolean }, record: TableRow) => {
            if (item.isGlobal) {
              if (feature.isBase) {
                return <PrivilegeDisplay privilege={globalPrivilege.minimum} />;
              }

              const actualPrivileges = this.props.effectivePrivileges.getActualGlobalFeaturePrivilege(
                feature.id
              );

              return <PrivilegeDisplay privilege={actualPrivileges} />;
            } else {
              // not global

              if (feature.isBase) {
                const actualBasePrivileges = this.props.effectivePrivileges.explainActualSpaceBasePrivilege(
                  item.spacesIndex
                );

                if (actualBasePrivileges.source === PRIVILEGE_SOURCE.EFFECTIVE_OVERRIDES_ASSIGNED) {
                  return (
                    <SupercededPrivilegeDisplay
                      privilege={actualBasePrivileges.privilege}
                      supercededPrivilege={actualBasePrivileges.supercededPrivilege}
                      overrideSource={actualBasePrivileges.overrideSource}
                    />
                  );
                }

                return <PrivilegeDisplay privilege={actualBasePrivileges.privilege} />;
              }

              const actualPrivileges = this.props.effectivePrivileges.explainActualSpaceFeaturePrivilege(
                feature.id,
                item.spacesIndex
              );

              if (actualPrivileges.source === PRIVILEGE_SOURCE.EFFECTIVE_OVERRIDES_ASSIGNED) {
                return (
                  <SupercededPrivilegeDisplay
                    privilege={actualPrivileges.privilege}
                    supercededPrivilege={actualPrivileges.supercededPrivilege}
                    overrideSource={actualPrivileges.overrideSource}
                  />
                );
              }

              return <PrivilegeDisplay privilege={actualPrivileges.privilege} />;
            }
          },
        };
      }),
    ];

    return (
      <EuiInMemoryTable
        columns={columns}
        items={rows}
        // TODO: FIX the ts-ignores
        // @ts-ignore
        rowProps={item => {
          return {
            className: item.feature.isBase ? 'secPrivilegeMatrix__row--isBasePrivilege' : '',
          };
        }}
        // @ts-ignore
        cellProps={item => {
          // TODO: FIX THIS TO ACTUALLY WORK
          return {
            className: item.isGlobal ? 'secPrivilegeMatrix__cell--isGlobalPrivilege' : '',
          };
        }}
      />
    );
  };

  private locateGlobalPrivilege = () => {
    return (
      this.props.role.kibana.spaces.find(spacePriv => spacePriv.spaces.includes('*')) || {
        spaces: ['*'],
        minimum: [],
        feature: [],
      }
    );
  };

  private hideModal = () => {
    this.setState({
      showModal: false,
    });
  };

  private showModal = () => {
    this.setState({
      showModal: true,
    });
  };
}
