/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { DeleteActionName, DeleteActionNameProps } from './delete_action_name';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../../app/app_dependencies');

describe('Transform: Transform List Actions <DeleteAction />', () => {
  test('Minimal initialization', () => {
    const props: DeleteActionNameProps = {
      canDeleteTransform: true,
      disabled: false,
      isBulkAction: false,
    };

    const wrapper = shallow(<DeleteActionName {...props} />);
    expect(wrapper).toMatchSnapshot();
  });
});
