/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { render } from '@testing-library/react';
import { shallow } from 'enzyme';
import React from 'react';

import { ControlPanel } from '.';

describe('control_panel', () => {
  describe('ControlPanel', () => {
    it('should render grid selection correctly', () => {
      const element = shallow(
        <ControlPanel currentViewType={'grid'} totalItemCount={0} onViewTypeChange={() => {}} />
      );

      expect(element).toMatchSnapshot();
    });

    it('should render list selection correctly', () => {
      const element = shallow(
        <ControlPanel currentViewType={'list'} totalItemCount={0} onViewTypeChange={() => {}} />
      );

      expect(element).toMatchSnapshot();
    });

    it('should render singular count correctly', () => {
      const element = shallow(
        <ControlPanel currentViewType={'grid'} totalItemCount={1} onViewTypeChange={() => {}} />
      );

      expect(element).toMatchSnapshot();
    });

    it('should render plural count correctly', () => {
      const element = shallow(
        <ControlPanel currentViewType={'grid'} totalItemCount={100} onViewTypeChange={() => {}} />
      );

      expect(element).toMatchSnapshot();
    });

    it('should trigger onViewTypeChange', async () => {
      const onToggle = jest.fn();
      const element = render(
        <ControlPanel currentViewType={'list'} totalItemCount={100} onViewTypeChange={onToggle} />
      );

      (await element.findAllByTestId('viewTypeToggleButton'))[0].click();

      expect(onToggle).toBeCalledWith('grid');
    });
  });
});
