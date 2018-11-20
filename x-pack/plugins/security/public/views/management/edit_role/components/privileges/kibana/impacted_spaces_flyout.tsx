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
<<<<<<< HEAD
=======
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import React, { Component, Fragment } from 'react';
import { PrivilegeSpaceTable } from './privilege_space_table';

import { Space } from '../../../../../../../../spaces/common/model/space';
import { ManageSpacesButton } from '../../../../../../../../spaces/public/components';
import { UserProfile } from '../../../../../../../../xpack_main/public/services/user_profile';
import { KibanaPrivilege } from '../../../../../../../common/model/kibana_privilege';
import { Role } from '../../../../../../../common/model/role';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';

interface Props {
  role: Role;
  spaces: Space[];
  userProfile: UserProfile;
<<<<<<< HEAD
=======
  intl: InjectedIntl;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
}

interface State {
  showImpactedSpaces: boolean;
}

<<<<<<< HEAD
export class ImpactedSpacesFlyout extends Component<Props, State> {
=======
class ImpactedSpacesFlyoutUI extends Component<Props, State> {
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
            View summary of spaces privileges
=======
            <FormattedMessage
              id="xpack.security.management.editRoles.impactedSpacesFlyout.viewSpacesPrivilegesSummaryLinkText"
              defaultMessage="View summary of spaces privileges"
            />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
    if (privileges.indexOf('all') >= 0) {
      return 'all';
    }
    if (privileges.indexOf('read') >= 0) {
      return 'read';
    }
    return 'none';
=======
    const { intl } = this.props;
    if (privileges.indexOf('all') >= 0) {
      return intl.formatMessage({
        id: 'xpack.security.management.editRoles.impactedSpacesFlyout.allLabel',
        defaultMessage: 'all',
      }) as KibanaPrivilege;
    }
    if (privileges.indexOf('read') >= 0) {
      return intl.formatMessage({
        id: 'xpack.security.management.editRoles.impactedSpacesFlyout.readLabel',
        defaultMessage: 'read',
      }) as KibanaPrivilege;
    }
    return intl.formatMessage({
      id: 'xpack.security.management.editRoles.impactedSpacesFlyout.noneLabel',
      defaultMessage: 'none',
    }) as KibanaPrivilege;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
            <h1 id="showImpactedSpacesTitle">Summary of space privileges</h1>
=======
            <h1 id="showImpactedSpacesTitle">
              <FormattedMessage
                id="xpack.security.management.editRoles.impactedSpacesFlyout.spacePrivilegesSummaryTitle"
                defaultMessage="Summary of space privileges"
              />
            </h1>
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
=======

export const ImpactedSpacesFlyout = injectI18n(ImpactedSpacesFlyoutUI);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
