/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';
import '../../../../../__mocks__/shallow_useeffect.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiButton, EuiFieldNumber, EuiForm, EuiSelect, EuiSwitch } from '@elastic/eui';

import { CrawlUnits } from '../../../../api/crawler/types';

import { AutomaticCrawlScheduler } from './automatic_crawl_scheduler';

const MOCK_ACTIONS = {
  // AutomaticCrawlSchedulerLogic
  setCrawlFrequency: jest.fn(),
  setCrawlUnit: jest.fn(),
  saveChanges: jest.fn(),
  toggleCrawlAutomatically: jest.fn(),
};

const MOCK_VALUES = {
  crawlAutomatically: false,
  crawlFrequency: 7,
  crawlUnit: CrawlUnits.days,
  isSubmitting: false,
};

describe('AutomaticCrawlScheduler', () => {
  let wrapper: ShallowWrapper;

  beforeEach(() => {
    setMockActions(MOCK_ACTIONS);
    setMockValues(MOCK_VALUES);

    wrapper = shallow(<AutomaticCrawlScheduler />);
  });

  it('renders', () => {
    expect(wrapper.find(EuiForm)).toHaveLength(1);
    expect(wrapper.find(EuiFieldNumber)).toHaveLength(1);
    expect(wrapper.find(EuiSelect)).toHaveLength(1);
  });

  it('saves changes on form submit', () => {
    const preventDefault = jest.fn();
    wrapper.find(EuiForm).simulate('submit', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(MOCK_ACTIONS.saveChanges).toHaveBeenCalled();
  });

  it('contains a switch that toggles automatic crawling', () => {
    wrapper.find(EuiSwitch).simulate('change');

    expect(MOCK_ACTIONS.toggleCrawlAutomatically).toHaveBeenCalled();
  });

  it('contains a number field that updates the crawl frequency', () => {
    wrapper.find(EuiFieldNumber).simulate('change', { target: { value: '10' } });

    expect(MOCK_ACTIONS.setCrawlFrequency).toHaveBeenCalledWith(10);
  });

  it('contains a select field that updates the crawl unit', () => {
    wrapper.find(EuiSelect).simulate('change', { target: { value: CrawlUnits.weeks } });

    expect(MOCK_ACTIONS.setCrawlUnit).toHaveBeenCalledWith(CrawlUnits.weeks);
  });

  it('contains a submit button', () => {
    expect(wrapper.find(EuiButton).prop('type')).toEqual('submit');
  });
});
