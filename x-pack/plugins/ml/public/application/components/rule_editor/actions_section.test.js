/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';

import { ActionsSection } from './actions_section';
import { ACTION } from '../../../../common/constants/detector_rule';

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

    const component = shallowWithIntl(<ActionsSection {...props} />);

    expect(component).toMatchSnapshot();
  });

  test('renders with skip_result selected', () => {
    const props = {
      ...requiredProps,
      actions: [ACTION.SKIP_RESULT],
    };

    const component = shallowWithIntl(<ActionsSection {...props} />);

    expect(component).toMatchSnapshot();
  });

  test('renders with skip_result and skip_model_update selected', () => {
    const component = shallowWithIntl(
      <ActionsSection
        actions={[ACTION.SKIP_RESULT, ACTION.SKIP_MODEL_UPDATE]}
        onSkipResultChange={() => {}}
        onSkipModelUpdateChange={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
