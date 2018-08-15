/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiCallOut,
  EuiLink,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiFlyoutBody,
  EuiButton,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';
import { PrivilegeSpaceTable } from './privilege_space_table';
import './privilege_callout.less';

export class PrivilegeCalloutWarning extends Component {
  state = {
    showImpactedSpaces: false
  };

  render() {
    const callout = this.getCallout();
    const flyout = this.getFlyout();

    return (
      <Fragment>
        {callout}
        {flyout}
      </Fragment>
    );
  }

  getCallout = () => {
    const {
      basePrivilege,
      isReservedRole
    } = this.props;

    if (basePrivilege === 'all') {
      if (isReservedRole) {
        return (
          <Fragment>
            <EuiCallOut color="warning" iconType="iInCircle" title={'Cannot customize a reserved role\'s space privileges'}>
              <p>
                This role always grants full access to all spaces.
                To customize privileges for individual spaces, you must create a new role.
              </p>
            </EuiCallOut>
            {this.getShowImpactedSpacesLink()}
          </Fragment>
        );
      } else {
        return (
          <Fragment>
            <EuiCallOut color="warning" iconType="iInCircle" title={'Minimum privilege is too high to customize individual spaces'}>
              <p>
                Setting the minimum privilege to <strong>all</strong> grants full access to all spaces.
                To customize privileges for individual spaces,
              the minimum privilege must be either <strong>read</strong> or <strong>none</strong>.
              </p>
            </EuiCallOut>
            {this.getShowImpactedSpacesLink()}
          </Fragment>
        );
      }
    }

    if (basePrivilege === 'read') {
      if (isReservedRole) {
        return (
          <EuiCallOut color="warning" iconType="iInCircle" title={'Cannot customize a reserved role\'s space privileges'}>
            <p>
              This role always grants read access to all spaces.
              To customize privileges for individual spaces, you must create a new role.
            </p>
          </EuiCallOut>
        );
      } else {
        return (
          <EuiCallOut color="primary" iconType="iInCircle" title={'Lowest possible privilege is \'read\''} />
        );
      }
    }

    if (basePrivilege === NO_PRIVILEGE_VALUE && isReservedRole) {
      return (
        <EuiCallOut color="warning" iconType="iInCircle" title={'Cannot customize a reserved role\'s space privileges'}>
          <p>
            This role never grants access to any spaces within Kibana.
            To customize privileges for individual spaces, you must create a new role.
          </p>
        </EuiCallOut>
      );
    }

    return null;
  }

  getFlyout = () => {
    if (!this.state.showImpactedSpaces) {
      return null;
    }

    const {
      role,
      spaces,
    } = this.props;

    const spacePrivileges = spaces.reduce((acc, space) => {
      return {
        ...acc,
        [space.id]: ['all']
      };
    }, {});

    return (
      <EuiFlyout onClose={this.toggleShowImpactedSpaces} aria-labelledby="showImpactedSpacesTitle">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h1 id="showImpactedSpacesTitle">Summary of all space privileges</h1>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <PrivilegeSpaceTable readonly={true} role={role} spaces={spaces} spacePrivileges={spacePrivileges} />
        </EuiFlyoutBody>
        <EuiFlyoutFooter className="privilegeCallout--footer">
          <EuiButton fill onClick={() => { }}>Manage Spaces</EuiButton>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }

  getShowImpactedSpacesLink = () => {
    return (
      <div className="privilegeCallout--showSpacesLink">
        <EuiSpacer />
        <EuiLink onClick={this.toggleShowImpactedSpaces}>See summary of all spaces privileges</EuiLink>
      </div>
    );
  }

  toggleShowImpactedSpaces = () => {
    this.setState({
      showImpactedSpaces: !this.state.showImpactedSpaces
    });
  };
}

PrivilegeCalloutWarning.propTypes = {
  role: PropTypes.object.isRequired,
  spaces: PropTypes.array.isRequired,
  basePrivilege: PropTypes.string.isRequired,
  isReservedRole: PropTypes.bool.isRequired,
};
