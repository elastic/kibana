/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  Component,
} from 'react';

import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderSectionItemButton,
  EuiLink,
  EuiText,
  EuiSpacer,
  EuiPopover,
} from '@elastic/eui';

/**
 * Placeholder for now from eui demo. Will need to be populated by Security plugin
 */
export class SecurityNavControl extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isOpen: false,
      userLoaded: this.props.user ? this.props.user.$resolved : false
    };
  }

  componentDidUpdate(prevProps, prevState) {
    // Force re-rendering once the user promise resolves
    if (this.props.user && !prevState.userLoaded) {
      this.props.user.$promise.then(() => this.setState({ userLoaded: true }));
    }
  }

  onMenuButtonClick = () => {
    this.setState({
      isOpen: !this.state.isOpen,
    });
  };

  closeMenu = () => {
    this.setState({
      isOpen: false,
    });
  };

  render() {
    // Wait for the user to finish loading
    if (!this.state.userLoaded) {
      return null;
    }

    const { user, route } = this.props;
    const name = user.full_name || user.username || '';
    const button = (
      <EuiHeaderSectionItemButton
        aria-controls="headerUserMenu"
        aria-expanded={this.state.isOpen}
        aria-haspopup="true"
        aria-label="Account menu"
        onClick={this.onMenuButtonClick}
      >
        <EuiAvatar name={name} size="s" />
      </EuiHeaderSectionItemButton>
    );

    return (
      <EuiPopover
        id="headerUserMenu"
        ownFocus
        button={button}
        isOpen={this.state.isOpen}
        anchorPosition="downRight"
        closePopover={this.closeMenu}
        panelPaddingSize="none"
      >
        <div style={{ width: 320 }}>
          <EuiFlexGroup gutterSize="m" className="euiHeaderProfile" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiAvatar name={name} size="xl" />
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiText>
                <p>{name}</p>
              </EuiText>

              <EuiSpacer size="m" />

              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <EuiLink href={route}>Edit profile</EuiLink>
                    </EuiFlexItem>

                    <EuiFlexItem grow={false}>
                      <EuiLink href="/logout">Log out</EuiLink>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiPopover>
    );
  }
}