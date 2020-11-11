/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @elastic/eui/href-or-on-click */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { Observable, Subscription } from 'rxjs';
import {
  EuiAvatar,
  EuiHeaderSectionItemButton,
  EuiPopover,
  EuiLoadingSpinner,
  EuiIcon,
  EuiContextMenu,
  EuiContextMenuPanelItemDescriptor,
  IconType,
  EuiText,
} from '@elastic/eui';
import { AuthenticatedUser } from '../../common/model';

import './nav_control_component.scss';

export interface UserMenuLink {
  label: string;
  iconType: IconType;
  href: string;
  order?: number;
}

interface Props {
  user: Promise<AuthenticatedUser>;
  editProfileUrl: string;
  logoutUrl: string;
  userMenuLinks$: Observable<UserMenuLink[]>;
}

interface State {
  isOpen: boolean;
  authenticatedUser: AuthenticatedUser | null;
  userMenuLinks: UserMenuLink[];
}

export class SecurityNavControl extends Component<Props, State> {
  private subscription?: Subscription;

  constructor(props: Props) {
    super(props);

    this.state = {
      isOpen: false,
      authenticatedUser: null,
      userMenuLinks: [],
    };

    props.user.then((authenticatedUser) => {
      this.setState({
        authenticatedUser,
      });
    });
  }

  componentDidMount() {
    this.subscription = this.props.userMenuLinks$.subscribe(async (userMenuLinks) => {
      this.setState({ userMenuLinks });
    });
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
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
    const { editProfileUrl, logoutUrl } = this.props;
    const { authenticatedUser, userMenuLinks } = this.state;

    const username =
      (authenticatedUser && (authenticatedUser.full_name || authenticatedUser.username)) || '';

    const buttonContents = authenticatedUser ? (
      <EuiAvatar name={username} size="s" />
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

    const profileMenuItem = {
      name: (
        <FormattedMessage
          id="xpack.security.navControlComponent.editProfileLinkText"
          defaultMessage="Profile"
        />
      ),
      icon: <EuiIcon type="user" size="m" />,
      href: editProfileUrl,
      onClick: this.closeMenu,
      'data-test-subj': 'profileLink',
    };

    const logoutMenuItem = {
      name: (
        <FormattedMessage
          id="xpack.security.navControlComponent.logoutLinkText"
          defaultMessage="Log out"
        />
      ),
      icon: <EuiIcon type="exit" size="m" />,
      href: logoutUrl,
      onClick: this.closeMenu,
      'data-test-subj': 'logoutLink',
    };

    const items: EuiContextMenuPanelItemDescriptor[] = [];

    items.push(profileMenuItem);

    if (userMenuLinks.length) {
      const userMenuLinkMenuItems = userMenuLinks
        .sort(({ order: orderA = Infinity }, { order: orderB = Infinity }) => orderA - orderB)
        .map(({ label, iconType, href }: UserMenuLink) => ({
          name: <EuiText>{label}</EuiText>,
          icon: <EuiIcon type={iconType} size="m" />,
          href,
          onClick: this.closeMenu,
          'data-test-subj': `userMenuLink__${label}`,
        }));

      items.push(...userMenuLinkMenuItems, {
        isSeparator: true,
        key: 'securityNavControlComponent__userMenuLinksSeparator',
      });
    }

    items.push(logoutMenuItem);

    const panels = [
      {
        id: 0,
        title: username,
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
        buffer={0}
      >
        <div data-test-subj="userMenu">
          <EuiContextMenu className="chrNavControl__userMenu" initialPanelId={0} panels={panels} />
        </div>
      </EuiPopover>
    );
  }
}
