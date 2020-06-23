/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { AddItem } from './index';
import { useFormFieldMock } from '../../../../common/mock/test_providers';

describe('AddItem', () => {
  it('renders correctly', () => {
    const Component = () => {
      const field = useFormFieldMock();

      return (
        <AddItem
          addText="text"
          field={field}
          dataTestSubj="dataTestSubj"
          idAria="idAria"
          isDisabled={false}
        />
      );
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive().find('[iconType="plusInCircle"]')).toHaveLength(1);
  });
});
