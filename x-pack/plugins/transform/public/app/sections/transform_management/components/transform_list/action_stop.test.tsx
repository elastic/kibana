/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { TransformListRow } from '../../../../common';
import { StopAction } from './action_stop';

import transformListRow from '../../../../common/__mocks__/transform_list_row.json';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../../app/app_dependencies');

describe('Transform: Transform List Actions <StopAction />', () => {
  test('Minimal initialization', () => {
    const item: TransformListRow = transformListRow;
    const props = {
      disabled: false,
      items: [item],
      stopTransform(d: TransformListRow) {},
    };

    const wrapper = shallow(<StopAction {...props} />);

    expect(wrapper).toMatchSnapshot();
  });
});
