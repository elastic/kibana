/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { XYZTMSEditor } from './xyz_tms_editor';

const onSourceConfigChange = () => {};

test('should render', () => {
  const component = shallow(<XYZTMSEditor onSourceConfigChange={onSourceConfigChange} />);
  expect(component).toMatchSnapshot();
});

describe('attribution validation', () => {
  test('should provide validation error when attribution text is provided without attribution url', () => {
    const component = shallow(<XYZTMSEditor onSourceConfigChange={onSourceConfigChange} />);
    component.setState({ attributionText: 'myAttribtionLabel' });
    expect(component).toMatchSnapshot();
  });

  test('should provide validation error when attribution url is provided without attribution text', () => {
    const component = shallow(<XYZTMSEditor onSourceConfigChange={onSourceConfigChange} />);
    component.setState({ attributionUrl: 'http://mySource' });
    expect(component).toMatchSnapshot();
  });

  test('should provide no validation errors when attribution text and attribution url are provided', () => {
    const component = shallow(<XYZTMSEditor onSourceConfigChange={onSourceConfigChange} />);
    component.setState({ attributionText: 'myAttribtionLabel' });
    component.setState({ attributionUrl: 'http://mySource' });
    expect(component).toMatchSnapshot();
  });
});
