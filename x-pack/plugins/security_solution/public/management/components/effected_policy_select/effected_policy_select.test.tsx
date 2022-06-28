/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EffectedPolicySelect, EffectedPolicySelectProps } from './effected_policy_select';
import React from 'react';
import { forceHTMLElementOffsetWidth } from './test_utils';
import { fireEvent, act } from '@testing-library/react';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../common/mock/endpoint';

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
      isPlatinumPlus: true,
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
      const { getByTestId } = render({ isGlobal: false });
      const euiSelectableMessageElement =
        getByTestId('test-policiesSelectable').getElementsByClassName('euiSelectableMessage')[0];
      expect(euiSelectableMessageElement).not.toBeNull();
      expect(euiSelectableMessageElement.textContent).toEqual('No options available');
    });
  });

  describe('and policy entries exist', () => {
    const policyId = 'abc123';
    const policyTestSubj = `policy-${policyId}`;

    const selectGlobalPolicy = () => {
      act(() => {
        fireEvent.click(renderResult.getByTestId('globalPolicy'));
      });
    };

    const selectPerPolicy = () => {
      act(() => {
        fireEvent.click(renderResult.getByTestId('perPolicy'));
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
      const { getByTestId } = render({ isGlobal: false });
      expect(getByTestId(policyTestSubj));
    });

    it('should hide policy items if global is checked', () => {
      const { queryByTestId } = render({ isGlobal: true });
      expect(queryByTestId(policyTestSubj)).toBeNull();
    });

    it('should enable policy items if global is unchecked', async () => {
      const { getByTestId } = render({ isGlobal: false });
      selectPerPolicy();
      expect(getByTestId(policyTestSubj).getAttribute('aria-disabled')).toEqual('false');
    });

    it('should call onChange with selection when global is toggled', () => {
      render();

      selectPerPolicy();
      expect(handleOnChange.mock.calls[0][0]).toEqual({
        isGlobal: false,
        selected: [],
      });

      selectGlobalPolicy();
      expect(handleOnChange.mock.calls[1][0]).toEqual({
        isGlobal: true,
        selected: [],
      });
    });

    it('should maintain policies selection even if global was checked, and user switched back to per policy', () => {
      render();

      selectPerPolicy();
      clickOnPolicy();
      expect(handleOnChange.mock.calls[1][0]).toEqual({
        isGlobal: false,
        selected: [componentProps.options[0]],
      });

      // Toggle isGlobal back to True
      selectGlobalPolicy();
      expect(handleOnChange.mock.calls[2][0]).toEqual({
        isGlobal: true,
        selected: [componentProps.options[0]],
      });
    });

    it('should show loader only when by polocy selected', () => {
      const { queryByTestId } = render({ isLoading: true });
      expect(queryByTestId('loading-spinner')).toBeNull();
      selectPerPolicy();
      expect(queryByTestId('loading-spinner')).not.toBeNull();
    });
  });
});
