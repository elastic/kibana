/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import { act } from '@testing-library/react';
import React from 'react';

import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';

import { AdvancedSettingsSubtitle } from './advanced_settings_subtitle';

describe('AdvancedSettingsSubtitle', () => {
  it('renders as expected', async () => {
    const space = {
      id: 'my-space',
      name: 'My Space',
      disabledFeatures: [],
    };

    const wrapper = mountWithIntl(
      <AdvancedSettingsSubtitle getActiveSpace={() => Promise.resolve(space)} />
    );

    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });
});
