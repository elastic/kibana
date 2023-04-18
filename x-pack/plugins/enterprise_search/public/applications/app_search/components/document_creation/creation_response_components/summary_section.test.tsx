/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';

import { shallow } from 'enzyme';

import { EuiAccordion, EuiIcon } from '@elastic/eui';

import { SummarySectionAccordion, SummarySectionEmpty } from './summary_section';

describe('SummarySectionAccordion', () => {
  const props = {
    id: 'some-id',
    status: 'success' as 'success' | 'error' | 'info',
    title: 'Some title',
  };

  it('renders', () => {
    const wrapper = shallow(
      <SummarySectionAccordion {...props}>Hello World</SummarySectionAccordion>
    );

    expect(wrapper.type()).toEqual(EuiAccordion);
    expect(wrapper.hasClass('documentCreationSummarySection')).toBe(true);
    expect(wrapper.find(EuiAccordion).prop('children')).toEqual('Hello World');
  });

  it('renders a title', () => {
    const wrapper = shallow(<SummarySectionAccordion {...props} title="Hello World" />);
    const buttonContent = shallow(wrapper.find(EuiAccordion).prop('buttonContent') as ReactElement);

    expect(buttonContent.find('.documentCreationSummarySection__title').text()).toEqual(
      '<EuiIcon />Hello World'
    );
  });

  it('renders icons based on the status prop', () => {
    const wrapper = shallow(<SummarySectionAccordion {...props} />);
    const getIcon = () => {
      const buttonContent = shallow(
        wrapper.find(EuiAccordion).prop('buttonContent') as ReactElement
      );
      return buttonContent.find(EuiIcon);
    };

    wrapper.setProps({ status: 'error' });
    expect(getIcon().prop('type')).toEqual('error');
    expect(getIcon().prop('color')).toEqual('danger');

    wrapper.setProps({ status: 'success' });
    expect(getIcon().prop('type')).toEqual('checkInCircleFilled');
    expect(getIcon().prop('color')).toEqual('success');

    wrapper.setProps({ status: 'info' });
    expect(getIcon().prop('type')).toEqual('iInCircle');
    expect(getIcon().prop('color')).toEqual('default');
  });
});

describe('SummarySectionEmpty', () => {
  it('renders', () => {
    const wrapper = shallow(<SummarySectionEmpty title="No new documents" />);

    expect(wrapper.hasClass('documentCreationSummarySection')).toBe(true);
    expect(wrapper.find('.documentCreationSummarySection__title').text()).toEqual(
      '<EuiIcon />No new documents'
    );
    expect(wrapper.find(EuiIcon).prop('type')).toEqual('iInCircle');
    expect(wrapper.find(EuiIcon).prop('color')).toEqual('default');
  });
});
