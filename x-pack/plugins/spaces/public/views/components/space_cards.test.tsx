/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { SpaceCards } from './space_cards';

test('it renders without crashing', () => {
  const space = {
    id: 'space-id',
    name: 'space name',
    description: 'space description',
    disabledFeatures: [],
  };

  shallow(<SpaceCards spaces={[space]} onSpaceSelect={jest.fn()} />);
});
