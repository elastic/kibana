/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { CaseStatuses } from '../../../common/api';
import { Stats } from './stats';

describe('Stats', () => {
  const defaultProps = {
    caseStatus: CaseStatuses.open,
    caseCount: 2,
    isLoading: false,
    dataTestSubj: 'test-stats',
  };
  it('it renders', async () => {
    const wrapper = mount(<Stats {...defaultProps} />);

    expect(wrapper.find(`[data-test-subj="test-stats"]`).exists()).toBeTruthy();
  });

  it('shows the count', async () => {
    const wrapper = mount(<Stats {...defaultProps} />);

    expect(
      wrapper.find(`[data-test-subj="test-stats"] .euiDescriptionList__description`).first().text()
    ).toBe('2');
  });

  it('shows the loading spinner', async () => {
    const wrapper = mount(<Stats {...defaultProps} isLoading={true} />);

    expect(wrapper.find(`[data-test-subj="test-stats-loading-spinner"]`).exists()).toBeTruthy();
  });

  describe('Status title', () => {
    it('shows the correct title for status open', async () => {
      const wrapper = mount(<Stats {...defaultProps} />);

      expect(
        wrapper.find(`[data-test-subj="test-stats"] .euiDescriptionList__title`).first().text()
      ).toBe('Open cases');
    });

    it('shows the correct title for status in-progress', async () => {
      const wrapper = mount(<Stats {...defaultProps} caseStatus={CaseStatuses['in-progress']} />);

      expect(
        wrapper.find(`[data-test-subj="test-stats"] .euiDescriptionList__title`).first().text()
      ).toBe('In progress cases');
    });

    it('shows the correct title for status closed', async () => {
      const wrapper = mount(<Stats {...defaultProps} caseStatus={CaseStatuses.closed} />);

      expect(
        wrapper.find(`[data-test-subj="test-stats"] .euiDescriptionList__title`).first().text()
      ).toBe('Closed cases');
    });
  });
});
