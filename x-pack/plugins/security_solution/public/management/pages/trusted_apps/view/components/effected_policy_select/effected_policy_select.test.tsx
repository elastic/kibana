/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointDocGenerator } from '../../../../../../../common/endpoint/generate_data';
import { EffectedPolicySelect, EffectedPolicySelectProps } from './effected_policy_select';
import { render } from '@testing-library/react';
import React from 'react';
import { forceHTMLElementOffsetWith } from './test_utils';

describe('when using EffectedPolicySelect component', () => {
  const generator = new EndpointDocGenerator('effected-poilcy-select');

  let resetHTMLElementOffsetWidth: () => void;

  beforeAll(() => {
    resetHTMLElementOffsetWidth = forceHTMLElementOffsetWith();
  });

  afterAll(() => resetHTMLElementOffsetWidth());

  describe('and no policy entries exist', () => {});

  describe('and policy entries exist', () => {
    let renderProps: EffectedPolicySelectProps;

    const renderWithPolicies = () =>
      render(<EffectedPolicySelect {...renderProps} style={{ width: '100px' }} />);

    beforeEach(() => {
      const policy = generator.generatePolicyPackagePolicy();
      policy.name = 'test policy A';
      policy.id = 'abc123';

      renderProps = {
        isGlobal: true,
        selected: [],
        options: [policy],
        onChange: jest.fn(),
        height: 100,
      };
    });

    it('should display policies', () => {
      const renderResult = renderWithPolicies();
      const { getByTestId } = renderResult;
      expect(getByTestId('policy-abc123'));
    });

    it.todo('should disable policy items if global is checked');

    it.todo('should enable policy items if global is unchecked');

    it.todo('should call onChange with selection');

    it.todo('should maintain policies selection even if global was checked');
  });
});
