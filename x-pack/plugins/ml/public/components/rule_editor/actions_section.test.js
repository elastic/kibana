/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { shallow } from 'enzyme';
import React from 'react';

import { ActionsSection } from './actions_section';
import { ACTION } from '../../../common/constants/detector_rule';

describe('ActionsSection', () => {

  const onSkipResultChange = jest.fn(() => {});
  const onSkipModelUpdateChange = jest.fn(() => {});

  const requiredProps = {
    onSkipResultChange,
    onSkipModelUpdateChange,
  };

  test('renders with no actions selected', () => {
    const props = {
      ...requiredProps,
      actions: [],
    };

    const component = shallow(
      <ActionsSection {...props} />
    );

    expect(component).toMatchSnapshot();

  });

  test('renders with skip_result selected', () => {
    const props = {
      ...requiredProps,
      actions: [ACTION.SKIP_RESULT],
    };

    const component = shallow(
      <ActionsSection {...props} />
    );

    expect(component).toMatchSnapshot();


  });

  test('renders with skip_result and skip_model_update selected', () => {

    const component = shallow(
      <ActionsSection
        actions={[ACTION.SKIP_RESULT, ACTION.SKIP_MODEL_UPDATE]}
        onSkipResultChange={() => {}}
        onSkipModelUpdateChange={() => {}}
      />
    );

    expect(component).toMatchSnapshot();

  });

});
