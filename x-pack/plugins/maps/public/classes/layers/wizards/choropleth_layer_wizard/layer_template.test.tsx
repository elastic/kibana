/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../../kibana_services', () => {
  const MockIndexPatternSelect = (props: unknown) => {
    return <div />;
  };
  return {
    getIndexPatternSelectComponent: () => {
      return MockIndexPatternSelect;
    },
    getEMSSettings() {
      return {
        isEMSUrlSet() {
          return false;
        },
      };
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
  isOnFinalStep: false,
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
