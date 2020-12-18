/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  setAsProfile?: boolean;
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
  profileOverridden: boolean;
}

export class SecurityNavControl extends Component<Props, State> {
  private subscription?: Subscription;

  constructor(props: Props) {
    super(props);

    this.state = {
      isOpen: false,
      authenticatedUser: null,
      userMenuLinks: [],
      profileOverridden: false,
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

      if (userMenuLinks.length) {
        let overrideCount = 0;
        for (const key in userMenuLinks) {
          // Check if any user links are profile links (i.e. override the default profile link)
          if (userMenuLinks[key].setAsProfile) {
            overrideCount++;

            this.setState({
              profileOverridden: true,
            });
          }
        }
        // Show a warning when more than one override exits.
        if (overrideCount > 1) {
          // eslint-disable-next-line no-console
          console.warn(
            'More than one profile link override has been found. A single override is recommended.'
          );
        }
      }
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
    const { authenticatedUser, userMenuLinks, profileOverridden } = this.state;

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

    const isAnonymousUser = authenticatedUser?.authentication_provider.type === 'anonymous';
    const items: EuiContextMenuPanelItemDescriptor[] = [];

    if (userMenuLinks.length) {
      const userMenuLinkMenuItems = userMenuLinks
        .sort(({ order: orderA = Infinity }, { order: orderB = Infinity }) => orderA - orderB)
        .map(({ label, iconType, href }: UserMenuLink) => ({
          name: <EuiText>{label}</EuiText>,
          icon: <EuiIcon type={iconType} size="m" />,
          href,
          'data-test-subj': `userMenuLink__${label}`,
        }));
      items.push(...userMenuLinkMenuItems);
    }

    if (!isAnonymousUser) {
      const profileMenuItem = {
        name: profileOverridden ? (
          <FormattedMessage
            id="xpack.security.navControlComponent.editProfileLinkTextSecondary"
            defaultMessage="Preferences"
          />
        ) : (
          <FormattedMessage
            id="xpack.security.navControlComponent.editProfileLinkText"
            defaultMessage="Profile"
          />
        ),
        icon: <EuiIcon type={profileOverridden ? 'controlsHorizontal' : 'user'} size="m" />,
        href: editProfileUrl,
        'data-test-subj': 'profileLink',
      };
      items.push(profileMenuItem);
    }

    const logoutMenuItem = {
      name: isAnonymousUser ? (
        <FormattedMessage
          id="xpack.security.navControlComponent.loginLinkText"
          defaultMessage="Log in"
        />
      ) : (
        <FormattedMessage
          id="xpack.security.navControlComponent.logoutLinkText"
          defaultMessage="Log out"
        />
      ),
      icon: <EuiIcon type="exit" size="m" />,
      href: logoutUrl,
      'data-test-subj': 'logoutLink',
    };
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
