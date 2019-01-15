/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
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
    };
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
    const { user, editProfileUrl, logoutUrl } = this.props;
    const name = user.full_name || user.username || '';
    const button = (
      <EuiHeaderSectionItemButton
        aria-controls="headerUserMenu"
        aria-expanded={this.state.isOpen}
        aria-haspopup="true"
        aria-label={
          <FormattedMessage
            id="xpack.security.navControlComponent.accountMenuAriaLabel"
            defaultMessage="Account menu"
          />
        }
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
        repositionOnScroll
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
                      <EuiLink href={editProfileUrl}>
                        <FormattedMessage
                          id="xpack.security.navControlComponent.editProfileLinkText"
                          defaultMessage="Edit profile"
                        />
                      </EuiLink>
                    </EuiFlexItem>

                    <EuiFlexItem grow={false}>
                      <EuiLink href={logoutUrl}>
                        <FormattedMessage
                          id="xpack.security.navControlComponent.logoutLinkText"
                          defaultMessage="Log out"
                        />
                      </EuiLink>
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
