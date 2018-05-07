/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import CodePreview from '../index';
import props from './props.json';
import { toJson } from '../../../../utils/testHelpers';

describe('CodePreview', () => {
  it('should render with data', () => {
    const wrapper = mount(<CodePreview {...props} />);
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
