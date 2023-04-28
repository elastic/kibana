/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { mount, shallow } from 'enzyme';

import { Status } from '../../../../../common/types/api';

import { EnterpriseSearchEnginesPageTemplate } from '../layout/engines_page_template';

import { LicensingCallout } from '../shared/licensing_callout/licensing_callout';

import { EmptyEnginesPrompt } from './components/empty_engines_prompt';
import { EnginesListTable } from './components/tables/engines_table';
import { EnginesList, CreateEngineButton } from './engines_list';
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
      name: 'engine-name-1',
      updated: '1999-12-31T23:59:59Z',
    },
  ],
  status: Status.SUCCESS,
};

const mockActions = {
  fetchEngines: jest.fn(),
  onPaginate: jest.fn(),
};

describe('EnginesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.localStorage.clear();
  });
  it('renders loading when isLoading', () => {
    setMockValues(DEFAULT_VALUES);
    setMockActions(mockActions);

    const wrapper = shallow(<EnginesList />);
    const pageTemplate = wrapper.find(EnterpriseSearchEnginesPageTemplate);

    expect(pageTemplate.prop('isLoading')).toEqual(true);
  });
  it('renders empty prompt when no data is available', () => {
    setMockValues({ ...DEFAULT_VALUES, hasNoEngines: true, isFirstRequest: false });
    setMockActions(mockActions);
    const wrapper = shallow(<EnginesList />);

    expect(wrapper.find(EmptyEnginesPrompt)).toHaveLength(1);
    expect(wrapper.find(EnginesListTable)).toHaveLength(0);
    expect(wrapper.find(CreateEngineButton)).toHaveLength(1);
    expect(wrapper.find(CreateEngineButton).prop('disabled')).toBeFalsy();
  });

  it('renders with Engines data ', async () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallow(<EnginesList />);

    expect(wrapper.find(EnginesListTable)).toHaveLength(1);
    expect(wrapper.find(EmptyEnginesPrompt)).toHaveLength(0);
    expect(wrapper.find(CreateEngineButton)).toHaveLength(0);
  });

  it('renders Platinum license callout when not Cloud or Platinum', async () => {
    setMockValues({
      ...DEFAULT_VALUES,
      hasPlatinumLicense: false,
      isCloud: false,
    });
    setMockActions(mockActions);
    const wrapper = shallow(<EnginesList />);

    expect(wrapper.find(EnginesListTable)).toHaveLength(0);
    expect(wrapper.find(EmptyEnginesPrompt)).toHaveLength(1);
    expect(wrapper.find(LicensingCallout)).toHaveLength(1);
    expect(wrapper.find(CreateEngineButton)).toHaveLength(1);
    expect(wrapper.find(CreateEngineButton).prop('disabled')).toBeTruthy();
  });

  it('Does not render Platinum license callout when Cloud', async () => {
    setMockValues({
      ...DEFAULT_VALUES,
      hasPlatinumLicense: false,
      isCloud: true,
    });
    setMockActions(mockActions);
    const wrapper = shallow(<EnginesList />);

    expect(wrapper.find(LicensingCallout)).toHaveLength(0);
  });
});

describe('CreateEngineButton', () => {
  describe('disabled={true}', () => {
    it('renders a disabled button that shows a popover when hovered', () => {
      const wrapper = mount(<CreateEngineButton disabled />);

      const button = wrapper.find(
        'button[data-test-subj="enterprise-search-content-engines-creation-button"]'
      );

      expect(button).toHaveLength(1);
      expect(button.prop('disabled')).toBeTruthy();

      let popover = wrapper.find('div[data-test-subj="create-engine-button-popover-content"]');

      expect(popover).toHaveLength(0);

      const hoverTarget = wrapper.find('div[data-test-subj="create-engine-button-hover-target"]');

      expect(hoverTarget).toHaveLength(1);

      hoverTarget.simulate('mouseEnter');

      wrapper.update();

      popover = wrapper.find('div[data-test-subj="create-engine-button-popover-content"]');

      expect(popover).toHaveLength(1);
      expect(popover.text()).toMatch(
        'This functionality is in technical preview and may be changed or removed completely in a future release.'
      );
    });
  });
  describe('disabled={false}', () => {
    it('renders a button and shows a popover when hovered', () => {
      const wrapper = mount(<CreateEngineButton disabled={false} />);

      const button = wrapper.find(
        'button[data-test-subj="enterprise-search-content-engines-creation-button"]'
      );

      expect(button).toHaveLength(1);
      expect(button.prop('disabled')).toBeFalsy();

      let popover = wrapper.find('div[data-test-subj="create-engine-button-popover-content"]');

      expect(popover).toHaveLength(0);

      const hoverTarget = wrapper.find('div[data-test-subj="create-engine-button-hover-target"]');

      expect(hoverTarget).toHaveLength(1);

      hoverTarget.simulate('mouseEnter');

      wrapper.update();

      popover = wrapper.find('div[data-test-subj="create-engine-button-popover-content"]');

      expect(popover).toHaveLength(1);
      expect(popover.text()).toMatch(
        'This functionality is in technical preview and may be changed or removed completely in a future release.'
      );
    });
  });
});
