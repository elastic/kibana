/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import React from 'react';

import { mountWithIntl } from '@kbn/test-jest-helpers';

import { SpaceAvatarInternal } from '../../../space_avatar/space_avatar_internal';
import { AdvancedSettingsTitle } from './advanced_settings_title';

describe('AdvancedSettingsTitle', () => {
  it('renders without crashing', async () => {
    const space = {
      id: 'my-space',
      name: 'My Space',
      disabledFeatures: [],
    };

    const wrapper = mountWithIntl(
      <AdvancedSettingsTitle getActiveSpace={() => Promise.resolve(space)} />
    );

    await act(async () => {});

    // wait for SpaceAvatar to lazy-load
    await act(async () => {});
    wrapper.update();

    expect(wrapper.find(SpaceAvatarInternal)).toHaveLength(1);
  });
});
