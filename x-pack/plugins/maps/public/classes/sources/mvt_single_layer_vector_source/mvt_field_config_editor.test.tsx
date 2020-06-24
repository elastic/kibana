/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../kibana_services', () => ({}));

import React from 'react';
import { shallow } from 'enzyme';

import { MVTFieldConfigEditor } from './mvt_field_config_editor';
import { MVTFieldType } from '../../../../common/constants';

test('should render field editor', async () => {
  const fields = [
    {
      name: 'foo',
      type: MVTFieldType.STRING,
    },
    {
      name: 'food',
      type: MVTFieldType.STRING,
    },
    {
      name: 'fooz',
      type: MVTFieldType.NUMBER,
    },
  ];
  const component = shallow(<MVTFieldConfigEditor fields={fields} onChange={() => {}} />);

  expect(component).toMatchSnapshot();
});
