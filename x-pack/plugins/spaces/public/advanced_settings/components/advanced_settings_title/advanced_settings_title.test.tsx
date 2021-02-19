/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import React from 'react';

import { mountWithIntl, nextTick } from '@kbn/test/jest';

import { SpaceAvatar } from '../../../space_avatar';
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

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(SpaceAvatar)).toHaveLength(1);
  });
});
