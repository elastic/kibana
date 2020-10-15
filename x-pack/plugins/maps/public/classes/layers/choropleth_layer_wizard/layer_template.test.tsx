/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../kibana_services', () => {
  const MockIndexPatternSelect = (props: unknown) => {
    return <div />;
  };
  return {
    getIndexPatternSelectComponent: () => {
      return MockIndexPatternSelect;
    },
  };
});

import React from 'react';
import { shallow } from 'enzyme';
import { BOUNDARIES_SOURCE, LayerTemplate } from './layer_template';

const renderWizardArguments = {
  previewLayers: () => {},
  mapColors: [],
  currentStepId: null,
  enableNextBtn: () => {},
  disableNextBtn: () => {},
  startStepLoading: () => {},
  stopStepLoading: () => {},
  advanceToNextStep: () => {},
};

test('should render elasticsearch UI when left source is BOUNDARIES_SOURCE.ELASTICSEARCH', async () => {
  const component = shallow(<LayerTemplate {...renderWizardArguments} />);
  component.setState({ leftSource: BOUNDARIES_SOURCE.ELASTICSEARCH });
  expect(component).toMatchSnapshot();
});

test('should render EMS UI when left source is BOUNDARIES_SOURCE.EMS', async () => {
  const component = shallow(<LayerTemplate {...renderWizardArguments} />);
  component.setState({ leftSource: BOUNDARIES_SOURCE.EMS });
  expect(component).toMatchSnapshot();
});
