/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';
import {
  EuiAvatar,
  EuiHeaderSectionItemButton,
  EuiPopover,
  EuiLoadingSpinner,
  EuiIcon,
  EuiContextMenu,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { AuthenticatedUser } from '../../common/model';

import './nav_control_component.scss';

interface Props {
  user: Promise<AuthenticatedUser>;
  editProfileUrl: string;
  logoutUrl: string;
  isCloudEnabled?: boolean;
  cloudResetPasswordUrl?: string;
  cloudAccountUrl?: string;
  cloudSecurityUrl?: string;
}

interface State {
  isOpen: boolean;
  authenticatedUser: AuthenticatedUser | null;
}

export class SecurityNavControl extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isOpen: false,
      authenticatedUser: null,
    };

    props.user.then((authenticatedUser) => {
      this.setState({
        authenticatedUser,
      });
    });
  }

  onMenuButtonClick = () => {
    if (!this.state.authenticatedUser) {
      return;
    }

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
    const {
      editProfileUrl,
      logoutUrl,
      isCloudEnabled = false,
      cloudResetPasswordUrl,
      cloudAccountUrl,
      cloudSecurityUrl,
    } = this.props;
    const { authenticatedUser } = this.state;

    const name =
      (authenticatedUser && (authenticatedUser.full_name || authenticatedUser.username)) || '';

    const buttonContents = authenticatedUser ? (
      <EuiAvatar name={name} size="s" />
    ) : (
      <EuiLoadingSpinner size="m" />
    );

    const button = (
      <EuiHeaderSectionItemButton
        aria-controls="headerUserMenu"
        aria-expanded={this.state.isOpen}
        aria-haspopup="true"
        aria-label={i18n.translate('xpack.security.navControlComponent.accountMenuAriaLabel', {
          defaultMessage: 'Account menu',
        })}
        onClick={this.onMenuButtonClick}
        data-test-subj="userMenuButton"
      >
        {buttonContents}
      </EuiHeaderSectionItemButton>
    );

    const items: EuiContextMenuPanelItemDescriptor[] = [
      {
        name: (
          <FormattedMessage
            id="xpack.security.navControlComponent.editProfileLinkText"
            defaultMessage="Profile"
          />
        ),
        icon: <EuiIcon type="user" size="m" />,
        href: editProfileUrl,
        'data-test-subj': 'profileLink',
      },
    ];

    if (isCloudEnabled) {
      items.push(
        {
          name: (
            <FormattedMessage
              id="xpack.security.navControlComponent.cloudProfileLinkText"
              defaultMessage="Cloud profile"
            />
          ),
          icon: <EuiIcon type="logoCloud" size="m" />,
          href: cloudResetPasswordUrl,
          'data-test-subj': 'cloudProfileLink',
        },
        {
          name: (
            <FormattedMessage
              id="xpack.security.navControlComponent.cloudAccountLinkText"
              defaultMessage="Account"
            />
          ),
          icon: <EuiIcon type="gear" size="m" />,
          href: cloudAccountUrl,
          'data-test-subj': 'cloudAccountLink',
        },
        {
          name: (
            <FormattedMessage
              id="xpack.security.navControlComponent.cloudSecurityLinkText"
              defaultMessage="Security"
            />
          ),
          icon: <EuiIcon type="lock" size="m" />,
          href: cloudSecurityUrl,
          'data-test-subj': 'cloudSecurityLink',
        }
      );
    }

    items.push({
      name: (
        <FormattedMessage
          id="xpack.security.navControlComponent.logoutLinkText"
          defaultMessage="Log out"
        />
      ),
      className: 'securityNavControlComponent__logoutLink',
      icon: <EuiIcon type="exit" size="m" />,
      href: logoutUrl,
      'data-test-subj': 'logoutLink',
    });

    const panels = [
      {
        id: 0,
        title: name,
        items,
      },
    ];

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
        <div data-test-subj="userMenu">
          <EuiContextMenu
            className="securityNavControlComponent__userMenu"
            initialPanelId={0}
            panels={panels}
          />
        </div>
      </EuiPopover>
    );
  }
}
