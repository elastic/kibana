/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointDocGenerator } from '../../../../../../../common/endpoint/generate_data';
import { EffectedPolicySelect, EffectedPolicySelectProps } from './effected_policy_select';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import React from 'react';
import { forceHTMLElementOffsetWith } from './test_utils';

describe('when using EffectedPolicySelect component', () => {
  const generator = new EndpointDocGenerator('effected-poilcy-select');
  let mockedContext: AppContextTestRender;
  const handleOnChange: jest.MockedFunction<EffectedPolicySelectProps['onChange']> = jest.fn();
  const render = (props: Partial<EffectedPolicySelectProps> = {}) => {
    const componentProps = {
      ...{
        options: [],
        isGlobal: true,
        onChange: handleOnChange,
        'data-test-subj': 'test',
      },
      ...props,
    };
    return mockedContext.render(<EffectedPolicySelect {...componentProps} />);
  };
  let resetHTMLElementOffsetWidth: () => void;

  beforeAll(() => {
    resetHTMLElementOffsetWidth = forceHTMLElementOffsetWith();
  });

  afterAll(() => resetHTMLElementOffsetWidth());

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  afterEach(() => {
    handleOnChange.mockClear();
  });

  describe('and no policy entries exist', () => {
    it('should display no options available message', () => {
      const { getByTestId } = render();
      expect(getByTestId('test-policiesSelectable').textContent).toEqual('No options available');
    });
  });

  describe('and policy entries exist', () => {
    let renderProps: Partial<EffectedPolicySelectProps>;

    const renderWithPolicies = () => render(renderProps);

    beforeEach(() => {
      const policy = generator.generatePolicyPackagePolicy();
      policy.name = 'test policy A';
      policy.id = 'abc123';

      renderProps = {
        options: [policy],
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
