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
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';
import { Space } from '../../../../../../../../spaces/common/model/space';
import { ManageSpacesButton } from '../../../../../../../../spaces/public/components';
import { Role } from '../../../../../../../common/model/role';
import { PrivilegeSpaceTable } from './privilege_space_table';

interface Props {
  role: Role;
  spaces: Space[];
  intl: InjectedIntl;
}

interface State {
  showImpactedSpaces: boolean;
}

class ImpactedSpacesFlyoutUI extends Component<Props, State> {
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
            <FormattedMessage
              id="xpack.security.management.editRoles.impactedSpacesFlyout.viewSpacesPrivilegesSummaryLinkText"
              defaultMessage="View summary of spaces privileges"
            />
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

  public getHighestPrivilege(...privileges: string[]): string {
    const { intl } = this.props;
    if (privileges.indexOf('all') >= 0) {
      return intl.formatMessage({
        id: 'xpack.security.management.editRoles.impactedSpacesFlyout.allLabel',
        defaultMessage: 'all',
      });
    }
    if (privileges.indexOf('read') >= 0) {
      return intl.formatMessage({
        id: 'xpack.security.management.editRoles.impactedSpacesFlyout.readLabel',
        defaultMessage: 'read',
      });
    }
    return intl.formatMessage({
      id: 'xpack.security.management.editRoles.impactedSpacesFlyout.noneLabel',
      defaultMessage: 'none',
    });
  }

  public getFlyout = () => {
    if (!this.state.showImpactedSpaces) {
      return null;
    }

    const { role, spaces } = this.props;

    return (
      <EuiFlyout
        onClose={this.toggleShowImpactedSpaces}
        aria-labelledby="showImpactedSpacesTitle"
        size="s"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h1 id="showImpactedSpacesTitle">
              <FormattedMessage
                id="xpack.security.management.editRoles.impactedSpacesFlyout.spacePrivilegesSummaryTitle"
                defaultMessage="Summary of space privileges"
              />
            </h1>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <PrivilegeSpaceTable readonly={true} role={role} spaces={spaces} />
        </EuiFlyoutBody>
        <EuiFlyoutFooter className="showImpactedSpaces--flyout--footer">
          {/* TODO: Hide footer if button is not available */}
          <ManageSpacesButton />
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  };
}

export const ImpactedSpacesFlyout = injectI18n(ImpactedSpacesFlyoutUI);
