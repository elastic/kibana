/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../../mock';
import { PrimarySecondaryUserInfo, nilOrUnSet } from './primary_secondary_user_info';
import { useMountAppended } from '../../../../../utils/use_mount_appended';

describe('UserPrimarySecondary', () => {
  const mount = useMountAppended();

  describe('rendering', () => {
    test('it renders the default PrimarySecondaryUserInfo', () => {
      const wrapper = shallow(
        <PrimarySecondaryUserInfo
          contextId="context-123"
          eventId="event-123"
          userName="user-name-1"
          primary="primary-1"
          secondary="secondary-1"
        />
      );
      expect(wrapper).toMatchSnapshot();
    });

    test('should render user name only if that is all that is present', () => {
      const wrapper = mount(
        <TestProviders>
          <PrimarySecondaryUserInfo
            contextId="context-123"
            eventId="event-123"
            userName="user-name-1"
            primary={undefined}
            secondary={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('user-name-1');
    });

    test('should render user name only if the others are in unset mode', () => {
      const wrapper = mount(
        <TestProviders>
          <PrimarySecondaryUserInfo
            contextId="context-123"
            eventId="event-123"
            userName="user-name-1"
            primary="unset"
            secondary="unset"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('user-name-1');
    });

    test('should render primary name only if that is all that is present', () => {
      const wrapper = mount(
        <TestProviders>
          <PrimarySecondaryUserInfo
            contextId="context-123"
            eventId="event-123"
            primary="primary-1"
            userName={undefined}
            secondary={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('primary-1');
    });

    test('should render primary name only if the others are in unset mode', () => {
      const wrapper = mount(
        <TestProviders>
          <PrimarySecondaryUserInfo
            contextId="context-123"
            eventId="event-123"
            primary="primary-1"
            userName="unset"
            secondary="unset"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('primary-1');
    });

    test('should render the secondary name only if that is all that is present', () => {
      const wrapper = mount(
        <TestProviders>
          <PrimarySecondaryUserInfo
            contextId="context-123"
            eventId="event-123"
            userName={undefined}
            primary={undefined}
            secondary="secondary-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('secondary-1');
    });

    test('should render the secondary name only if the others are in unset mode', () => {
      const wrapper = mount(
        <TestProviders>
          <PrimarySecondaryUserInfo
            contextId="context-123"
            eventId="event-123"
            secondary="secondary-1"
            primary="unset"
            userName="unset"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('secondary-1');
    });

    test('should render the user name if all three are the same', () => {
      const wrapper = mount(
        <TestProviders>
          <PrimarySecondaryUserInfo
            contextId="context-123"
            eventId="event-123"
            userName="username-1"
            primary="username-1"
            secondary="username-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('username-1');
    });

    test('should render the primary with as if all three are different', () => {
      const wrapper = mount(
        <TestProviders>
          <PrimarySecondaryUserInfo
            contextId="context-123"
            eventId="event-123"
            userName="[username]"
            primary="[primary]"
            secondary="[secondary]"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[primary]as[secondary]');
    });
  });

  describe('#nilOrUnSet', () => {
    test('should return true if the value is undefined', () => {
      expect(nilOrUnSet()).toEqual(true);
    });

    test('should return true if the value is null', () => {
      expect(nilOrUnSet()).toEqual(true);
    });

    test('should return true if the value is unset', () => {
      expect(nilOrUnSet('unset')).toEqual(true);
    });

    test('should return true if the value is UnSeT', () => {
      expect(nilOrUnSet('UnSeT')).toEqual(true);
    });

    test('should return false if the value is unset with an extra space', () => {
      expect(nilOrUnSet('unset ')).toEqual(false);
    });

    test('should return false if the value is string named user-1', () => {
      expect(nilOrUnSet('user-1')).toEqual(false);
    });
  });
});
