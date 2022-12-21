/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { notificationServiceMock } from '@kbn/core/public/mocks';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

import type { SpacesManager } from '../../spaces_manager';
import { spacesManagerMock } from '../../spaces_manager/mocks';
import { DeleteSpacesButton } from './delete_spaces_button';

const space = {
  id: 'my-space',
  name: 'My Space',
  disabledFeatures: [],
};

describe('DeleteSpacesButton', () => {
  it('renders as expected', () => {
    const spacesManager = spacesManagerMock.create();

    const notifications = notificationServiceMock.createStartContract();

    const wrapper = shallowWithIntl(
      <DeleteSpacesButton
        space={space}
        spacesManager={spacesManager as unknown as SpacesManager}
        onDelete={jest.fn()}
        notifications={notifications}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
