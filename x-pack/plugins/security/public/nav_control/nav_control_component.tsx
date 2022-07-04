/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelItemDescriptor, IconType } from '@elastic/eui';
import {
  EuiContextMenu,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
} from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React, { useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { UserAvatarData } from '../../common';
import { getUserDisplayName, isUserAnonymous } from '../../common/model';
import { useCurrentUser, UserAvatar, useUserProfile } from '../components';

export interface UserMenuLink {
  label: string;
  iconType: IconType;
  href: string;
  order?: number;
  setAsProfile?: boolean;
}

interface SecurityNavControlProps {
  editProfileUrl: string;
  logoutUrl: string;
  userMenuLinks$: Observable<UserMenuLink[]>;
}

export const SecurityNavControl: FunctionComponent<SecurityNavControlProps> = ({
  editProfileUrl,
  logoutUrl,
  userMenuLinks$,
}) => {
  const userMenuLinks = useObservable(userMenuLinks$, []);
  const [isOpen, setIsOpen] = useState(false);

  const userProfile = useUserProfile<{ avatar: UserAvatarData }>('avatar');
  const currentUser = useCurrentUser(); // User profiles do not exist for anonymous users so need to fetch current user as well

  const displayName = currentUser.value ? getUserDisplayName(currentUser.value) : '';

  const button = (
    <EuiHeaderSectionItemButton
      aria-controls="headerUserMenu"
      aria-expanded={isOpen}
      aria-haspopup="true"
      aria-label={i18n.translate('xpack.security.navControlComponent.accountMenuAriaLabel', {
        defaultMessage: 'Account menu',
      })}
      onClick={() => setIsOpen((value) => (currentUser.value ? !value : false))}
      data-test-subj="userMenuButton"
      style={{ lineHeight: 'normal' }}
    >
      {currentUser.value && userProfile.value ? (
        <UserAvatar
          user={currentUser.value}
          avatar={userProfile.value.data.avatar}
          size="s"
          data-test-subj="userMenuAvatar"
        />
      ) : currentUser.value && userProfile.error ? (
        <UserAvatar user={currentUser.value} size="s" data-test-subj="userMenuAvatar" />
      ) : (
        <EuiLoadingSpinner size="m" />
      )}
    </EuiHeaderSectionItemButton>
  );

  const isAnonymous = currentUser.value ? isUserAnonymous(currentUser.value) : false;
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

  if (!isAnonymous) {
    const hasCustomProfileLinks = userMenuLinks.some(({ setAsProfile }) => setAsProfile === true);
    const profileMenuItem: EuiContextMenuPanelItemDescriptor = {
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

  items.push({
    name: isAnonymous ? (
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
  });

  return (
    <EuiPopover
      id="headerUserMenu"
      ownFocus
      button={button}
      isOpen={isOpen}
      anchorPosition="downRight"
      repositionOnScroll
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      buffer={0}
    >
      <div data-test-subj="userMenu">
        <EuiContextMenu
          className="chrNavControl__userMenu"
          initialPanelId={0}
          panels={[
            {
              id: 0,
              title: displayName,
              items,
            },
          ]}
        />
      </div>
    </EuiPopover>
  );
};
