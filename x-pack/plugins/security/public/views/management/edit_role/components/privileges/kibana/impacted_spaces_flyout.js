/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import { PrivilegeSpaceTable } from './privilege_space_table';
import {
  EuiLink,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiFlyoutBody,
  EuiTitle,
} from '@elastic/eui';

import './impacted_spaces_flyout.less';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';
import { getKibanaPrivilegesViewModel } from '../../../lib/get_application_privileges';
import { ManageSpacesButton } from '../../../../../../../../spaces/public/components';

export class ImpactedSpacesFlyout extends Component {
  state = {
    showImpactedSpaces: false
  };

  render() {
    const flyout = this.getFlyout();
    return (
      <Fragment>
        <div className="showImpactedSpaces">
          <EuiLink onClick={this.toggleShowImpactedSpaces}>See summary of all spaces privileges</EuiLink>
        </div>
        {flyout}
      </Fragment>
    );
  }

  toggleShowImpactedSpaces = () => {
    this.setState({
      showImpactedSpaces: !this.state.showImpactedSpaces
    });
  }

  getFlyout = () => {
    if (!this.state.showImpactedSpaces) {
      return null;
    }

    const {
      role,
      spaces,
      kibanaAppPrivileges,
      basePrivilege,
    } = this.props;

    const { assignedPrivileges } = getKibanaPrivilegesViewModel(kibanaAppPrivileges, role.kibana);

    const allSpacePrivileges = spaces.reduce((acc, space) => {
      const spacePrivilege = assignedPrivileges.space[space.id] ? assignedPrivileges.space[space.id][0] : basePrivilege;

      let displayName = spacePrivilege;
      if (displayName === NO_PRIVILEGE_VALUE) {
        displayName = 'none';
      }

      return {
        ...acc,
        // Use the privilege assigned to the space, if provided. Otherwise, the baes privilege is used.
        [space.id]: [displayName]
      };
    }, {});

    return (
      <EuiFlyout onClose={this.toggleShowImpactedSpaces} aria-labelledby="showImpactedSpacesTitle" size="s">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h1 id="showImpactedSpacesTitle">Summary of all space privileges</h1>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <PrivilegeSpaceTable readonly={true} role={role} spaces={spaces} spacePrivileges={allSpacePrivileges} />
        </EuiFlyoutBody>
        <EuiFlyoutFooter className="showImpactedSpaces--flyout--footer">
          {/* TODO: Hide footer if button is not available */}
          <ManageSpacesButton />
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}

ImpactedSpacesFlyout.propTypes = {
  role: PropTypes.object.isRequired,
  kibanaAppPrivileges: PropTypes.array.isRequired,
  spaces: PropTypes.array.isRequired,
  basePrivilege: PropTypes.string.isRequired,
};
