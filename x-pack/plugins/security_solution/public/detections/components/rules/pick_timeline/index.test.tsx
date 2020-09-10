/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { PickTimeline } from './index';
import { useFormFieldMock } from '../../../../common/mock';

describe('PickTimeline', () => {
  it('renders correctly', () => {
    const Component = () => {
      const field = useFormFieldMock();

      return (
        <PickTimeline
          dataTestSubj="pick-timeline"
          idAria="idAria"
          isDisabled={false}
          field={field}
        />
      );
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive().find('[data-test-subj="pick-timeline"]')).toHaveLength(1);
  });
});
