/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../common/mock';
import { Pane } from '.';

describe('Pane', () => {
  test('renders correctly against snapshot', () => {
    const EmptyComponent = shallow(
      <TestProviders>
        <Pane onClose={jest.fn()} timelineId={'test'} usersViewing={[]} />
      </TestProviders>
    );
    expect(EmptyComponent.find('Pane')).toMatchSnapshot();
  });
});
