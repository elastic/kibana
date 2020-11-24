/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { render } from '@testing-library/react';
import { shallow } from 'enzyme';
import React from 'react';

import { ViewTypeToggle } from '.';

describe('view_type_toggle', () => {
  describe('ViewTypeToggle', () => {
    it('should render grid selection correctly', () => {
      const element = shallow(<ViewTypeToggle selectedOption="grid" onToggle={() => {}} />);

      expect(element).toMatchSnapshot();
    });

    it('should render list selection correctly', () => {
      const element = shallow(<ViewTypeToggle selectedOption="list" onToggle={() => {}} />);

      expect(element).toMatchSnapshot();
    });

    it('should trigger onToggle', async () => {
      const onToggle = jest.fn();
      const element = render(<ViewTypeToggle selectedOption="list" onToggle={onToggle} />);

      (await element.findAllByTestId('viewTypeToggleButton'))[0].click();

      expect(onToggle).toBeCalledWith('grid');
    });
  });
});
