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
import { fireEvent, act } from '@testing-library/react';

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

    const policyId = 'abc123';
    const policyTestSubj = `policy-${policyId}`;
    const renderWithPolicies = () => render(renderProps);

    beforeEach(() => {
      const policy = generator.generatePolicyPackagePolicy();
      policy.name = 'test policy A';
      policy.id = policyId;

      renderProps = {
        options: [policy],
      };
    });

    it('should display policies', () => {
      const { getByTestId } = renderWithPolicies();
      expect(getByTestId(policyTestSubj));
    });

    it('should disable policy items if global is checked', () => {
      const { getByTestId } = renderWithPolicies();
      expect(getByTestId(policyTestSubj).getAttribute('aria-disabled')).toEqual('true');
    });

    it('should enable policy items if global is unchecked', async () => {
      const { getByTestId } = renderWithPolicies();
      act(() => {
        fireEvent.click(getByTestId('test-globalSwitch'));
      });
      handleOnChange;
      expect(getByTestId(policyTestSubj).getAttribute('aria-disabled')).toEqual('false');
    });

    it.todo('should call onChange with selection');

    it.todo('should maintain policies selection even if global was checked');
  });
});
