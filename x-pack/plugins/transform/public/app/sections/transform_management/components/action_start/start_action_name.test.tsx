/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { TransformListRow } from '../../../../common';
import { StartActionName, StartActionNameProps } from './start_action_name';

import transformListRow from '../../../../common/__mocks__/transform_list_row.json';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../app_dependencies');

describe('Transform: Transform List Actions <StartAction />', () => {
  test('Minimal initialization', () => {
    // @ts-expect-error mock data is too loosely typed
    const item: TransformListRow = transformListRow;
    const props: StartActionNameProps = {
      forceDisable: false,
      items: [item],
      transformNodes: 1,
    };

    const wrapper = shallow(<StartActionName {...props} />);

    expect(wrapper).toMatchSnapshot();
  });
});
