/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu } from '@elastic/eui';
import { shallow } from 'enzyme';
import type { FunctionComponent, ReactElement } from 'react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject } from 'rxjs';

import { coreMock, themeServiceMock } from '@kbn/core/public/mocks';

import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';
import { userProfileMock } from '../../common/model/user_profile.mock';
import * as UseCurrentUserImports from '../components/use_current_user';
import { SecurityNavControl } from './nav_control_component';
import { Providers } from './nav_control_service';

jest.mock('../components/use_current_user');
jest.mock('react-use/lib/useObservable');

const useObservableMock = useObservable as jest.Mock;
const useUserProfileMock = jest.spyOn(UseCurrentUserImports, 'useUserProfile');

const userProfile = userProfileMock.create();
const coreStart = coreMock.createStart();
const theme$ = themeServiceMock.createTheme$();
const userMenuLinks$ = new BehaviorSubject([]);

const wrappingComponent: FunctionComponent = ({ children }) => (
  <Providers services={coreStart} theme$={theme$}>
    {children}
  </Providers>
);

describe('SecurityNavControl', () => {
  beforeEach(() => {
    useUserProfileMock.mockReset();
    useUserProfileMock.mockReturnValue({
      loading: false,
      value: userProfile,
    });

    useObservableMock.mockReset();
    useObservableMock.mockImplementation(
      (observable: BehaviorSubject<any>, initialValue = {}) => observable.value ?? initialValue
    );
  });

  it('should render an avatar when user profile has loaded', async () => {
    const wrapper = shallow(
      <SecurityNavControl editProfileUrl="" logoutUrl="" userMenuLinks$={userMenuLinks$} />,
      {
        wrappingComponent,
      }
    );

    expect(useUserProfileMock).toHaveBeenCalledTimes(1);
    expect(wrapper.prop<ReactElement>('button')).toMatchInlineSnapshot(`
      <EuiHeaderSectionItemButton
        aria-controls="headerUserMenu"
        aria-expanded={false}
        aria-haspopup="true"
        aria-label="Account menu"
        data-test-subj="userMenuButton"
        onClick={[Function]}
      >
        <UserAvatar
          data-test-subj="userMenuAvatar"
          size="s"
          user={
            Object {
              "active": true,
              "authentication_provider": Object {
                "name": "basic1",
                "type": "basic",
              },
              "authentication_realm": Object {
                "name": "native1",
                "type": "native",
              },
              "authentication_type": "realm",
              "email": "email",
              "enabled": true,
              "full_name": "full name",
              "lookup_realm": Object {
                "name": "native1",
                "type": "native",
              },
              "metadata": Object {
                "_reserved": false,
              },
              "roles": Array [],
              "username": "some-username",
            }
          }
        />
      </EuiHeaderSectionItemButton>
    `);
  });

  it('should render a spinner while loading', () => {
    useUserProfileMock.mockReturnValue({
      loading: true,
    });

    const wrapper = shallow(
      <SecurityNavControl editProfileUrl="" logoutUrl="" userMenuLinks$={userMenuLinks$} />,
      {
        wrappingComponent,
      }
    );

    expect(useUserProfileMock).toHaveBeenCalledTimes(1);
    expect(wrapper.prop<ReactElement>('button')).toMatchInlineSnapshot(`
      <EuiHeaderSectionItemButton
        aria-controls="headerUserMenu"
        aria-expanded={false}
        aria-haspopup="true"
        aria-label="Account menu"
        data-test-subj="userMenuButton"
        onClick={[Function]}
      >
        <EuiLoadingSpinner
          size="m"
        />
      </EuiHeaderSectionItemButton>
    `);
  });

  it('should open popover when avatar is clicked', async () => {
    const wrapper = shallow(
      <SecurityNavControl editProfileUrl="" logoutUrl="" userMenuLinks$={userMenuLinks$} />,
      {
        wrappingComponent,
      }
    );

    act(() => {
      wrapper.prop<ReactElement>('button').props.onClick();
      wrapper.update();
    });

    expect(wrapper.prop<boolean>('isOpen')).toEqual(true);
  });

  it('should not open popover while loading', () => {
    useUserProfileMock.mockReturnValue({
      loading: true,
    });

    const wrapper = shallow(
      <SecurityNavControl editProfileUrl="" logoutUrl="" userMenuLinks$={userMenuLinks$} />,
      {
        wrappingComponent,
      }
    );

    act(() => {
      wrapper.prop<ReactElement>('button').props.onClick();
      wrapper.update();
    });

    expect(wrapper.prop<boolean>('isOpen')).toEqual(false);
  });

  it('should render additional user menu links registered by other plugins', async () => {
    const wrapper = shallow(
      <SecurityNavControl
        editProfileUrl=""
        logoutUrl=""
        userMenuLinks$={
          new BehaviorSubject([
            { label: 'link1', href: 'path-to-link-1', iconType: 'empty', order: 1 },
            { label: 'link2', href: 'path-to-link-2', iconType: 'empty', order: 2 },
            { label: 'link3', href: 'path-to-link-3', iconType: 'empty', order: 3 },
          ])
        }
      />,
      {
        wrappingComponent,
      }
    );

    expect(wrapper.find(EuiContextMenu).prop('panels')).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": 0,
          "items": Array [
            Object {
              "data-test-subj": "profileLink",
              "href": "",
              "icon": <EuiIcon
                size="m"
                type="user"
              />,
              "name": <FormattedMessage
                defaultMessage="{profileOverridden, select, true{Preferences} other{Profile}}"
                id="xpack.security.navControlComponent.editProfileLinkText"
                values={
                  Object {
                    "profileOverridden": false,
                  }
                }
              />,
            },
            Object {
              "data-test-subj": "userMenuLink__link1",
              "href": "path-to-link-1",
              "icon": <EuiIcon
                size="m"
                type="empty"
              />,
              "name": "link1",
            },
            Object {
              "data-test-subj": "userMenuLink__link2",
              "href": "path-to-link-2",
              "icon": <EuiIcon
                size="m"
                type="empty"
              />,
              "name": "link2",
            },
            Object {
              "data-test-subj": "userMenuLink__link3",
              "href": "path-to-link-3",
              "icon": <EuiIcon
                size="m"
                type="empty"
              />,
              "name": "link3",
            },
            Object {
              "data-test-subj": "logoutLink",
              "href": "",
              "icon": <EuiIcon
                size="m"
                type="exit"
              />,
              "name": <FormattedMessage
                defaultMessage="Log out"
                id="xpack.security.navControlComponent.logoutLinkText"
                values={Object {}}
              />,
            },
          ],
          "title": "full name",
        },
      ]
    `);
  });

  it('should render custom profile link registered by other plugins', async () => {
    const wrapper = shallow(
      <SecurityNavControl
        editProfileUrl=""
        logoutUrl=""
        userMenuLinks$={
          new BehaviorSubject([
            { label: 'link1', href: 'path-to-link-1', iconType: 'empty', order: 1 },
            { label: 'link2', href: 'path-to-link-2', iconType: 'empty', order: 2 },
            {
              label: 'link3',
              href: 'path-to-link-3',
              iconType: 'empty',
              order: 3,
              setAsProfile: true,
            },
          ])
        }
      />,
      {
        wrappingComponent,
      }
    );

    expect(wrapper.find(EuiContextMenu).prop('panels')).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": 0,
          "items": Array [
            Object {
              "data-test-subj": "userMenuLink__link1",
              "href": "path-to-link-1",
              "icon": <EuiIcon
                size="m"
                type="empty"
              />,
              "name": "link1",
            },
            Object {
              "data-test-subj": "userMenuLink__link2",
              "href": "path-to-link-2",
              "icon": <EuiIcon
                size="m"
                type="empty"
              />,
              "name": "link2",
            },
            Object {
              "data-test-subj": "userMenuLink__link3",
              "href": "path-to-link-3",
              "icon": <EuiIcon
                size="m"
                type="empty"
              />,
              "name": "link3",
            },
            Object {
              "data-test-subj": "profileLink",
              "href": "",
              "icon": <EuiIcon
                size="m"
                type="controlsHorizontal"
              />,
              "name": <FormattedMessage
                defaultMessage="{profileOverridden, select, true{Preferences} other{Profile}}"
                id="xpack.security.navControlComponent.editProfileLinkText"
                values={
                  Object {
                    "profileOverridden": true,
                  }
                }
              />,
            },
            Object {
              "data-test-subj": "logoutLink",
              "href": "",
              "icon": <EuiIcon
                size="m"
                type="exit"
              />,
              "name": <FormattedMessage
                defaultMessage="Log out"
                id="xpack.security.navControlComponent.logoutLinkText"
                values={Object {}}
              />,
            },
          ],
          "title": "full name",
        },
      ]
    `);
  });

  it('should render anonymous user', async () => {
    useUserProfileMock.mockReturnValue({
      loading: false,
      value: userProfileMock.create({
        user: {
          ...mockAuthenticatedUser({
            authentication_provider: { type: 'anonymous', name: 'does no matter' },
          }),
          active: true,
        },
      }),
    });

    const wrapper = shallow(
      <SecurityNavControl editProfileUrl="" logoutUrl="" userMenuLinks$={userMenuLinks$} />,
      {
        wrappingComponent,
      }
    );

    expect(wrapper.find(EuiContextMenu).prop('panels')).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": 0,
          "items": Array [
            Object {
              "data-test-subj": "logoutLink",
              "href": "",
              "icon": <EuiIcon
                size="m"
                type="exit"
              />,
              "name": <FormattedMessage
                defaultMessage="Log in"
                id="xpack.security.navControlComponent.loginLinkText"
                values={Object {}}
              />,
            },
          ],
          "title": "full name",
        },
      ]
    `);
  });
});
