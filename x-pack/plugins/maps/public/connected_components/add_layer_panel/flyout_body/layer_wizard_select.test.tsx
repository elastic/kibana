/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../classes/layers/layer_wizard_registry', () => ({}));

import React from 'react';
import { shallow } from 'enzyme';
import { LayerWizardSelect } from './layer_wizard_select';
import { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';

const defaultProps = {
  onSelect: () => {},
};

describe('LayerWizardSelect', () => {
  beforeAll(() => {
    require('../../../classes/layers/layer_wizard_registry').getLayerWizards = async () => {
      return [
        {
          categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
          description: 'mock wizard without icon',
          renderWizard: () => {
            return <div />;
          },
          title: 'wizard 1',
        },
        {
          categories: [LAYER_WIZARD_CATEGORY.SOLUTIONS],
          description: 'mock wizard with icon',
          icon: 'logoObservability',
          renderWizard: () => {
            return <div />;
          },
          title: 'wizard 2',
        },
      ];
    };
  });

  test('Should render layer select after layer wizards are loaded', async () => {
    const component = shallow(<LayerWizardSelect {...defaultProps} />);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('Should render loading screen before layer wizards are loaded', () => {
    const component = shallow(<LayerWizardSelect {...defaultProps} />);

    expect(component).toMatchSnapshot();
  });
});
