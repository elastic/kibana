/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { FormLabelWithIconTip } from './form_label_with_icon_tip';

describe('FormLabelWithIconTip component', () => {
  let props;

  beforeEach(() => {
    props = {
      formRowLabelText: 'label text',
      formRowTooltipText: 'tooltip text',
    };
  });

  it('renders as expected', () => {
    const wrapper = shallow(<FormLabelWithIconTip {...props} />);
    expect(wrapper).toMatchSnapshot();
  });
});
