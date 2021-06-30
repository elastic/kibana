/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { NoIndicatorRuleEnrichmentsPanel } from './no_indicator_rule_enrichments_panel';

jest.mock('../../../lib/kibana');

describe('NoIndicatorRuleEnrichmentsPanel', () => {
  test('renders correct items', () => {
    const wrapper = mount(<NoIndicatorRuleEnrichmentsPanel />);
    expect(wrapper.find('[data-test-subj="no-indicator-rule-enrichments-panel"]').exists()).toEqual(
      true
    );
  });

  test('renders link to docs', () => {
    const wrapper = mount(<NoIndicatorRuleEnrichmentsPanel />);
    expect(wrapper.find('a').exists()).toEqual(true);
  });
});
