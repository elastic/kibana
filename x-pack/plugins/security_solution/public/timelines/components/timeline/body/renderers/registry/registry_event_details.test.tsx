/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { mockBrowserFields } from '../../../../../../common/containers/source/mock';
import {
  mockEndpointRegistryModificationEvent,
  TestProviders,
} from '../../../../../../common/mock';
import '../../../../../../common/mock/match_media';
import { useMountAppended } from '../../../../../../common/utils/use_mount_appended';
import { MODIFIED_REGISTRY_KEY } from '../system/translations';

import { RegistryEventDetails } from './registry_event_details';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    // eslint-disable-next-line react/display-name
    EuiScreenReaderOnly: () => <></>,
  };
});

describe('RegistryEventDetails', () => {
  const mount = useMountAppended();

  test('it renders the expected text given an Endpoint Registry modification event', () => {
    const wrapper = mount(
      <TestProviders>
        <RegistryEventDetails
          browserFields={mockBrowserFields}
          contextId="test-context"
          data={mockEndpointRegistryModificationEvent}
          text={MODIFIED_REGISTRY_KEY}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'SYSTEM\\NT AUTHORITY@win2019-endpoint-1modified registry keySOFTWARE\\WOW6432Node\\Google\\Update\\ClientState\\{430FD4D0-B729-4F61-AA34-91526481799D}\\CurrentStatewith new valueHKLM\\SOFTWARE\\WOW6432Node\\Google\\Update\\ClientState\\{430FD4D0-B729-4F61-AA34-91526481799D}\\CurrentState\\StateValueviaGoogleUpdate.exe(7408)'
    );
  });
});
