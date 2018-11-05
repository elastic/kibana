/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiTitle,
} from '@elastic/eui';
import React, { Component, Fragment } from 'react';
import { PrivilegeSpaceTable } from './privilege_space_table';

import { Space } from '../../../../../../../../spaces/common/model/space';
import { ManageSpacesButton } from '../../../../../../../../spaces/public/components';
import { UserProfile } from '../../../../../../../../xpack_main/common/user_profile';
import { KibanaPrivilege } from '../../../../../../../common/model/kibana_privilege';
import { Role } from '../../../../../../../common/model/role';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';

interface Props {
  role: Role;
  spaces: Space[];
  userProfile: UserProfile;
}

interface State {
  showImpactedSpaces: boolean;
}

export class ImpactedSpacesFlyout extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      showImpactedSpaces: false,
    };
  }

  public render() {
    const flyout = this.getFlyout();
    return (
      <Fragment>
        <div className="showImpactedSpaces">
          <EuiLink onClick={this.toggleShowImpactedSpaces}>
            View summary of spaces privileges
          </EuiLink>
        </div>
        {flyout}
      </Fragment>
    );
  }

  public toggleShowImpactedSpaces = () => {
    this.setState({
      showImpactedSpaces: !this.state.showImpactedSpaces,
    });
  };

  public getHighestPrivilege(...privileges: KibanaPrivilege[]): KibanaPrivilege {
    if (privileges.indexOf('all') >= 0) {
      return 'all';
    }
    if (privileges.indexOf('read') >= 0) {
      return 'read';
    }
    return 'none';
  }

  public getFlyout = () => {
    if (!this.state.showImpactedSpaces) {
      return null;
    }

    const { role, spaces } = this.props;

    const assignedPrivileges = role.kibana;
    const basePrivilege = assignedPrivileges.global.length
      ? assignedPrivileges.global[0]
      : NO_PRIVILEGE_VALUE;

    const allSpacePrivileges = spaces.reduce(
      (acc, space) => {
        const spacePrivilege = assignedPrivileges.space[space.id]
          ? assignedPrivileges.space[space.id][0]
          : basePrivilege;
        const actualPrivilege = this.getHighestPrivilege(spacePrivilege, basePrivilege);

        return {
          ...acc,
          // Use the privilege assigned to the space, if provided. Otherwise, the baes privilege is used.
          [space.id]: [actualPrivilege],
        };
      },
      { ...role.kibana.space }
    );

    return (
      <EuiFlyout
        onClose={this.toggleShowImpactedSpaces}
        aria-labelledby="showImpactedSpacesTitle"
        size="s"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h1 id="showImpactedSpacesTitle">Summary of space privileges</h1>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <PrivilegeSpaceTable
            readonly={true}
            role={role}
            spaces={spaces}
            spacePrivileges={allSpacePrivileges}
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter className="showImpactedSpaces--flyout--footer">
          {/* TODO: Hide footer if button is not available */}
          <ManageSpacesButton userProfile={this.props.userProfile} />
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  };
}
