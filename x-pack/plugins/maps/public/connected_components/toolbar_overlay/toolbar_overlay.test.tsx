/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Filter } from '@kbn/es-query';

jest.mock('../../kibana_services', () => {
  return {
    getMapsCapabilities() {
      return { save: true };
    },
  };
});

import { ToolbarOverlay } from './toolbar_overlay';

test('Should only show set view control', async () => {
  const component = shallow(
    <ToolbarOverlay
      showToolsControl={false}
      shapeDrawModeActive={false}
      pointDrawModeActive={false}
      showFitToBoundsButton={false}
      showTimesliderButton={false}
    />
  );
  expect(component).toMatchSnapshot();
});

test('Should show all controls', async () => {
  const component = shallow(
    <ToolbarOverlay
      showToolsControl={true}
      addFilters={async (filters: Filter[], actionId: string) => {}}
      showFitToBoundsButton={true}
      showTimesliderButton={true}
      shapeDrawModeActive={false}
      pointDrawModeActive={false}
    />
  );
  expect(component).toMatchSnapshot();
});

test('Should show point layer edit tools', async () => {
  const component = shallow(
    <ToolbarOverlay
      showToolsControl={false}
      shapeDrawModeActive={false}
      pointDrawModeActive={true}
      showFitToBoundsButton={false}
      showTimesliderButton={false}
    />
  );
  expect(component).toMatchSnapshot();
});

test('Should show shape layer edit tools', async () => {
  const component = shallow(
    <ToolbarOverlay
      showToolsControl={false}
      shapeDrawModeActive={true}
      pointDrawModeActive={false}
      showFitToBoundsButton={false}
      showTimesliderButton={false}
    />
  );
  expect(component).toMatchSnapshot();
});
