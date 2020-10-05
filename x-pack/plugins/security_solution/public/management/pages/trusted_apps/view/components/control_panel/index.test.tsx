/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { render } from '@testing-library/react';
import { shallow } from 'enzyme';
import React from 'react';

import { ControlPanel, ControlPanelProps } from '.';

describe('control_panel', () => {
  describe('ControlPanel', () => {
    it('should render grid selection correctly', () => {
      const state: ControlPanelProps['state'] = { currentViewType: 'grid', totalItemsCount: 0 };
      const element = shallow(<ControlPanel state={state} onViewTypeChange={() => {}} />);

      expect(element).toMatchSnapshot();
    });

    it('should render list selection correctly', () => {
      const state: ControlPanelProps['state'] = { currentViewType: 'list', totalItemsCount: 0 };
      const element = shallow(<ControlPanel state={state} onViewTypeChange={() => {}} />);

      expect(element).toMatchSnapshot();
    });

    it('should render singular count correctly', () => {
      const state: ControlPanelProps['state'] = { currentViewType: 'grid', totalItemsCount: 1 };
      const element = shallow(<ControlPanel state={state} onViewTypeChange={() => {}} />);

      expect(element).toMatchSnapshot();
    });

    it('should render plural count correctly', () => {
      const state: ControlPanelProps['state'] = { currentViewType: 'grid', totalItemsCount: 100 };
      const element = shallow(<ControlPanel state={state} onViewTypeChange={() => {}} />);

      expect(element).toMatchSnapshot();
    });

    it('should trigger onViewTypeChange', async () => {
      const onToggle = jest.fn();
      const state: ControlPanelProps['state'] = { currentViewType: 'list', totalItemsCount: 100 };
      const element = render(<ControlPanel state={state} onViewTypeChange={onToggle} />);

      (await element.findAllByTestId('viewTypeToggleButton'))[0].click();

      expect(onToggle).toBeCalledWith('grid');
    });
  });
});
