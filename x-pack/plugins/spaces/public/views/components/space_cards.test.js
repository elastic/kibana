/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { SpaceCards } from './space_cards';

test('it renders without crashing', () => {
  const space = {
    id: 'space-id',
    name: 'space name',
    description: 'space description'
  };

  shallow(<SpaceCards spaces={[space]} />);
});