/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';

import { Status } from '../../../../../common/types/api';

import { LicensingCallout } from '../../../shared/licensing_callout/licensing_callout';
import { EnterpriseSearchApplicationsPageTemplate } from '../layout/page_template';

import { EmptySearchApplicationsPrompt } from './components/empty_search_applications_prompt';
import { SearchApplicationsListTable } from './components/tables/search_applications_table';
import { SearchApplicationsList, CreateSearchApplicationButton } from './search_applications_list';
import { DEFAULT_META } from './types';

const DEFAULT_VALUES = {
  data: undefined,
  isLoading: true,
  meta: DEFAULT_META,
  parameters: { meta: DEFAULT_META },
  results: [],
  status: Status.IDLE,
  // LicensingLogic
  hasPlatinumLicense: true,
  // KibanaLogic
  isCloud: false,
};
const mockValues = {
  ...DEFAULT_VALUES,
  isLoading: false,
  results: [
    {
      created: '1999-12-31T23:59:59Z',
      indices: ['index-18', 'index-23'],
      name: 'search-application-1',
      updated: '1999-12-31T23:59:59Z',
    },
  ],
  status: Status.SUCCESS,
};

const mockActions = {
  fetchSearchApplications: jest.fn(),
  onPaginate: jest.fn(),
};

describe('SearchApplicationsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.localStorage.clear();
  });
  it('renders loading when isLoading', () => {
    setMockValues(DEFAULT_VALUES);
    setMockActions(mockActions);

    const wrapper = shallowWithIntl(<SearchApplicationsList />);
    const pageTemplate = wrapper.find(EnterpriseSearchApplicationsPageTemplate);

    expect(pageTemplate.prop('isLoading')).toEqual(true);
  });
  it('renders empty prompt when no data is available', () => {
    setMockValues({ ...DEFAULT_VALUES, hasNoSearchApplications: true, isFirstRequest: false });
    setMockActions(mockActions);
    const wrapper = shallowWithIntl(<SearchApplicationsList />);

    expect(wrapper.find(EmptySearchApplicationsPrompt)).toHaveLength(1);
    expect(wrapper.find(SearchApplicationsListTable)).toHaveLength(0);
    expect(wrapper.find(CreateSearchApplicationButton)).toHaveLength(1);
    expect(wrapper.find(CreateSearchApplicationButton).prop('disabled')).toBeFalsy();
  });

  it('renders with Search Applications data ', async () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallowWithIntl(<SearchApplicationsList />);

    expect(wrapper.find(SearchApplicationsListTable)).toHaveLength(1);
    expect(wrapper.find(EmptySearchApplicationsPrompt)).toHaveLength(0);
    expect(wrapper.find(CreateSearchApplicationButton)).toHaveLength(0);
  });

  it('renders Platinum license callout when not Cloud or Platinum', async () => {
    setMockValues({
      ...DEFAULT_VALUES,
      hasPlatinumLicense: false,
      isCloud: false,
    });
    setMockActions(mockActions);
    const wrapper = shallowWithIntl(<SearchApplicationsList />);

    expect(wrapper.find(SearchApplicationsListTable)).toHaveLength(0);
    expect(wrapper.find(EmptySearchApplicationsPrompt)).toHaveLength(1);
    expect(wrapper.find(LicensingCallout)).toHaveLength(1);
    expect(wrapper.find(CreateSearchApplicationButton)).toHaveLength(1);
    expect(wrapper.find(CreateSearchApplicationButton).prop('disabled')).toBeTruthy();
  });

  it('Does not render Platinum license callout when Cloud', async () => {
    setMockValues({
      ...DEFAULT_VALUES,
      hasPlatinumLicense: false,
      isCloud: true,
    });
    setMockActions(mockActions);
    const wrapper = shallowWithIntl(<SearchApplicationsList />);

    expect(wrapper.find(LicensingCallout)).toHaveLength(0);
  });
});

describe('CreateSearchApplicationButton', () => {
  describe('disabled={true}', () => {
    it('renders a disabled button that shows a popover when hovered', () => {
      const wrapper = mountWithIntl(<CreateSearchApplicationButton disabled />);

      const button = wrapper.find(
        'button[data-test-subj="enterprise-search-search-applications-creation-button"]'
      );

      expect(button).toHaveLength(1);
      expect(button.prop('disabled')).toBeTruthy();

      let popover = wrapper.find(
        'div[data-test-subj="create-search-application-button-popover-content"]'
      );

      expect(popover).toHaveLength(0);

      const hoverTarget = wrapper.find(
        'div[data-test-subj="create-search-application-button-hover-target"]'
      );

      expect(hoverTarget).toHaveLength(1);

      hoverTarget.simulate('mouseEnter');

      wrapper.update();

      popover = wrapper.find(
        'div[data-test-subj="create-search-application-button-popover-content"]'
      );

      expect(popover).toHaveLength(1);
      expect(popover.text()).toMatch(
        'This functionality may be changed or removed completely in a future release.'
      );
    });
  });
  describe('disabled={false}', () => {
    it('renders a button and shows a popover when hovered', () => {
      const wrapper = mountWithIntl(<CreateSearchApplicationButton disabled={false} />);

      const button = wrapper.find(
        'button[data-test-subj="enterprise-search-search-applications-creation-button"]'
      );

      expect(button).toHaveLength(1);
      expect(button.prop('disabled')).toBeFalsy();

      let popover = wrapper.find(
        'div[data-test-subj="create-search-application-button-popover-content"]'
      );

      expect(popover).toHaveLength(0);

      const hoverTarget = wrapper.find(
        'div[data-test-subj="create-search-application-button-hover-target"]'
      );

      expect(hoverTarget).toHaveLength(1);

      hoverTarget.simulate('mouseEnter');

      wrapper.update();

      popover = wrapper.find(
        'div[data-test-subj="create-search-application-button-popover-content"]'
      );

      expect(popover).toHaveLength(1);
      expect(popover.text()).toMatch(
        'This functionality may be changed or removed completely in a future release.'
      );
    });
  });
});
