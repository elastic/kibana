/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import { render, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import React from 'react';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';

import { PoliciesSelector, PoliciesSelectorProps } from '.';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

// TODO: remove this mock when feature flag is removed
jest.mock('../../../common/hooks/use_experimental_features');
const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;

let onChangeSelectionMock: jest.Mock;

describe('Policies selector', () => {
  let getElement: (params: Partial<PoliciesSelectorProps>) => RenderResult;
  beforeEach(() => {
    onChangeSelectionMock = jest.fn();
    useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
    getElement = (params: Partial<PoliciesSelectorProps>) => {
      return render(
        <I18nProvider>
          <PoliciesSelector
            policies={[policy]}
            onChangeSelection={onChangeSelectionMock}
            {...params}
          />
        </I18nProvider>
      );
    };
  });
  const generator = new EndpointDocGenerator('policy-list');
  const policy = generator.generatePolicyPackagePolicy();
  policy.name = 'test policy A';
  policy.id = 'abc123';

  describe('When click on policy', () => {
    it('should have a default value', () => {
      const defaultIncludedPolicies = 'abc123';
      const defaultExcludedPolicies = 'global';
      const element = getElement({ defaultExcludedPolicies, defaultIncludedPolicies });

      userEvent.click(element.getByTestId('policiesSelectorButton'));
      expect(element.getByText(policy.name)).toHaveTextContent(policy.name);

      userEvent.click(element.getByText('Unassigned entries'));
      expect(onChangeSelectionMock).toHaveBeenCalledWith([
        { checked: 'on', id: 'abc123', name: 'test policy A' },
        { checked: 'off', id: 'global', name: 'Global entries' },
        { checked: 'on', id: 'unassigned', name: 'Unassigned entries' },
      ]);
    });

    it('should disable enabled default value', () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
      const defaultIncludedPolicies = 'abc123';
      const defaultExcludedPolicies = 'global';
      const element = getElement({ defaultExcludedPolicies, defaultIncludedPolicies });

      userEvent.click(element.getByTestId('policiesSelectorButton'));

      userEvent.click(element.getByText(policy.name));
      expect(onChangeSelectionMock).toHaveBeenCalledWith([
        { checked: 'off', id: 'abc123', name: 'test policy A' },
        { checked: 'off', id: 'global', name: 'Global entries' },
        { checked: undefined, id: 'unassigned', name: 'Unassigned entries' },
      ]);
    });

    it('should remove disabled default value', () => {
      const defaultIncludedPolicies = 'abc123';
      const defaultExcludedPolicies = 'global';
      const element = getElement({ defaultExcludedPolicies, defaultIncludedPolicies });

      userEvent.click(element.getByTestId('policiesSelectorButton'));

      userEvent.click(element.getByText('Global entries'));
      expect(onChangeSelectionMock).toHaveBeenCalledWith([
        { checked: 'on', id: 'abc123', name: 'test policy A' },
        { checked: undefined, id: 'global', name: 'Global entries' },
        { checked: undefined, id: 'unassigned', name: 'Unassigned entries' },
      ]);
    });
  });

  describe('When filter policy', () => {
    it('should filter policy by name', () => {
      const element = getElement({});

      userEvent.click(element.getByTestId('policiesSelectorButton'));

      userEvent.type(element.getByTestId('policiesSelectorSearch'), policy.name);
      expect(element.queryAllByText('Global entries')).toStrictEqual([]);
      expect(element.getByText(policy.name)).toHaveTextContent(policy.name);
    });
    it('should filter with no results', () => {
      const element = getElement({});

      userEvent.click(element.getByTestId('policiesSelectorButton'));

      userEvent.type(element.getByTestId('policiesSelectorSearch'), 'no results');
      expect(element.queryAllByText('Global entries')).toStrictEqual([]);
      expect(element.queryAllByText('Unassigned entries')).toStrictEqual([]);
      expect(element.queryAllByText(policy.name)).toStrictEqual([]);
    });
    it('should filter with special chars', () => {
      const element = getElement({});

      userEvent.click(element.getByTestId('policiesSelectorButton'));

      userEvent.type(element.getByTestId('policiesSelectorSearch'), '*');
      expect(element.queryAllByText('Global entries')).toStrictEqual([]);
      expect(element.queryAllByText('Unassigned entries')).toStrictEqual([]);
      expect(element.queryAllByText(policy.name)).toStrictEqual([]);
    });
  });
});
