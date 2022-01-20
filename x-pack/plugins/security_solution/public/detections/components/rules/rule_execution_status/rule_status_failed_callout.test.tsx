/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common';
import { RuleStatusFailedCallOut } from './rule_status_failed_callout';

// TODO: https://github.com/elastic/kibana/pull/121644 clean up
// - switch to react testing library
// - test actual content being rendered
describe('RuleStatusFailedCallOut', () => {
  describe('Visibility conditions', () => {
    const renderWith = (status: RuleExecutionStatus | null | undefined) =>
      shallow(<RuleStatusFailedCallOut status={status} date="some date" message="some message" />);

    it('is hidden if status is undefined', () => {
      const wrapper = renderWith(undefined);
      expect(wrapper.find('EuiCallOut')).toHaveLength(0);
    });

    it('is hidden if status is null', () => {
      const wrapper = renderWith(null);
      expect(wrapper.find('EuiCallOut')).toHaveLength(0);
    });

    it('is hidden if status is "going to run"', () => {
      const wrapper = renderWith(RuleExecutionStatus['going to run']);
      expect(wrapper.find('EuiCallOut')).toHaveLength(0);
    });

    it('is hidden if status is "succeeded"', () => {
      const wrapper = renderWith(RuleExecutionStatus.succeeded);
      expect(wrapper.find('EuiCallOut')).toHaveLength(0);
    });

    it('is visible if status is "warning"', () => {
      const wrapper = renderWith(RuleExecutionStatus.warning);
      expect(wrapper.find('EuiCallOut')).toHaveLength(1);
    });

    it('is visible if status is "partial failure"', () => {
      const wrapper = renderWith(RuleExecutionStatus['partial failure']);
      expect(wrapper.find('EuiCallOut')).toHaveLength(1);
    });

    it('is visible if status is "failed"', () => {
      const wrapper = renderWith(RuleExecutionStatus.failed);
      expect(wrapper.find('EuiCallOut')).toHaveLength(1);
    });
  });
});
