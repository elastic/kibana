/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './nav_control_component.scss';

import type { EuiContextMenuPanelItemDescriptor, IconType } from '@elastic/eui';
import {
  EuiAvatar,
  EuiContextMenu,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
} from '@elastic/eui';
import React, { Component } from 'react';
import type { Observable, Subscription } from 'rxjs';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { AuthenticatedUser } from '../../common/model';

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
      <EuiAvatar name={username} size="s" data-test-subj="userMenuAvatar" />
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
          name: label,
          icon: <EuiIcon type={iconType} size="m" />,
          href,
          'data-test-subj': `userMenuLink__${label}`,
        }));
      items.push(...userMenuLinkMenuItems);
    }

    if (!isAnonymousUser) {
      const hasCustomProfileLinks = userMenuLinks.some(({ setAsProfile }) => setAsProfile === true);
      const profileMenuItem = {
        name: (
          <FormattedMessage
            id="xpack.security.navControlComponent.editProfileLinkText"
            defaultMessage="{profileOverridden, select, true{Preferences} other{Profile}}"
            values={{ profileOverridden: hasCustomProfileLinks }}
          />
        ),
        icon: <EuiIcon type={hasCustomProfileLinks ? 'controlsHorizontal' : 'user'} size="m" />,
        href: editProfileUrl,
        'data-test-subj': 'profileLink',
      };

      // Set this as the first link if there is no user-defined profile link
      if (!hasCustomProfileLinks) {
        items.unshift(profileMenuItem);
      } else {
        items.push(profileMenuItem);
      }
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
