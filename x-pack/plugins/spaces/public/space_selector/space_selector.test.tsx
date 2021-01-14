/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test/jest';
import { Space } from '../../../../../src/plugins/spaces_oss/common';
import { SpaceSelector } from './space_selector';
import { spacesManagerMock } from '../spaces_manager/mocks';

function getSpacesManager(spaces: Space[] = []) {
  const manager = spacesManagerMock.create();
  manager.getSpaces = jest.fn().mockResolvedValue(spaces);
  return manager;
}

test('it renders without crashing', () => {
  const spacesManager = getSpacesManager();
  const component = shallowWithIntl(
    <SpaceSelector spacesManager={spacesManager as any} serverBasePath={'/server-base-path'} />
  );
  expect(component).toMatchSnapshot();
});

test('it queries for spaces when loaded', () => {
  const spaces = [
    {
      id: 'space-1',
      name: 'Space 1',
      description: 'This is the first space',
      disabledFeatures: [],
    },
  ];

  const spacesManager = getSpacesManager(spaces);

  shallowWithIntl(
    <SpaceSelector spacesManager={spacesManager as any} serverBasePath={'/server-base-path'} />
  );

  return Promise.resolve().then(() => {
    expect(spacesManager.getSpaces).toHaveBeenCalledTimes(1);
  });
});
