/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointDocGenerator } from '../../../../../../../common/endpoint/generate_data';
import { EffectedPolicySelect, EffectedPolicySelectProps } from './effected_policy_select';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import React from 'react';
import { forceHTMLElementOffsetWidth } from './test_utils';
import { fireEvent, act } from '@testing-library/react';

describe('when using EffectedPolicySelect component', () => {
  const generator = new EndpointDocGenerator('effected-policy-select');

  let mockedContext: AppContextTestRender;
  let componentProps: EffectedPolicySelectProps;
  let renderResult: ReturnType<AppContextTestRender['render']>;

  const handleOnChange: jest.MockedFunction<EffectedPolicySelectProps['onChange']> = jest.fn();
  const render = (props: Partial<EffectedPolicySelectProps> = {}) => {
    componentProps = {
      ...componentProps,
      ...props,
    };
    renderResult = mockedContext.render(<EffectedPolicySelect {...componentProps} />);
    return renderResult;
  };
  let resetHTMLElementOffsetWidth: () => void;

  beforeAll(() => {
    resetHTMLElementOffsetWidth = forceHTMLElementOffsetWidth();
  });

  afterAll(() => resetHTMLElementOffsetWidth());

  beforeEach(() => {
    // Default props
    componentProps = {
      options: [],
      isGlobal: true,
      onChange: handleOnChange,
      'data-test-subj': 'test',
    };
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
    const policyId = 'abc123';
    const policyTestSubj = `policy-${policyId}`;

    const toggleGlobalSwitch = () => {
      act(() => {
        fireEvent.click(renderResult.getByTestId('test-globalSwitch'));
      });
    };

    const clickOnPolicy = () => {
      act(() => {
        fireEvent.click(renderResult.getByTestId(policyTestSubj));
      });
    };

    beforeEach(() => {
      const policy = generator.generatePolicyPackagePolicy();
      policy.name = 'test policy A';
      policy.id = policyId;

      componentProps = {
        ...componentProps,
        options: [policy],
      };

      handleOnChange.mockImplementation((selection) => {
        componentProps = {
          ...componentProps,
          ...selection,
        };
        renderResult.rerender(<EffectedPolicySelect {...componentProps} />);
      });
    });

    it('should display policies', () => {
      const { getByTestId } = render();
      expect(getByTestId(policyTestSubj));
    });

    it('should disable policy items if global is checked', () => {
      const { getByTestId } = render();
      expect(getByTestId(policyTestSubj).getAttribute('aria-disabled')).toEqual('true');
    });

    it('should enable policy items if global is unchecked', async () => {
      const { getByTestId } = render();
      toggleGlobalSwitch();
      expect(getByTestId(policyTestSubj).getAttribute('aria-disabled')).toEqual('false');
    });

    it('should call onChange with selection when global is toggled', () => {
      render();

      toggleGlobalSwitch();
      expect(handleOnChange.mock.calls[0][0]).toEqual({
        isGlobal: false,
        selected: [],
      });

      toggleGlobalSwitch();
      expect(handleOnChange.mock.calls[1][0]).toEqual({
        isGlobal: true,
        selected: [],
      });
    });

    it('should not allow clicking on policies when global is true', () => {
      render();

      clickOnPolicy();
      expect(handleOnChange.mock.calls.length).toBe(0);

      // Select a Policy, then switch back to global and try to click the policy again (should be disabled and trigger onChange())
      toggleGlobalSwitch();
      clickOnPolicy();
      toggleGlobalSwitch();
      clickOnPolicy();
      expect(handleOnChange.mock.calls.length).toBe(3);
      expect(handleOnChange.mock.calls[2][0]).toEqual({
        isGlobal: true,
        selected: [componentProps.options[0]],
      });
    });

    it('should maintain policies selection even if global was checked', () => {
      render();

      toggleGlobalSwitch();
      clickOnPolicy();
      expect(handleOnChange.mock.calls[1][0]).toEqual({
        isGlobal: false,
        selected: [componentProps.options[0]],
      });

      // Toggle isGlobal back to True
      toggleGlobalSwitch();
      expect(handleOnChange.mock.calls[2][0]).toEqual({
        isGlobal: true,
        selected: [componentProps.options[0]],
      });
    });
  });
});
