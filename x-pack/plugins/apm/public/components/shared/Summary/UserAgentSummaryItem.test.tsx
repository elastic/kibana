/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { UserAgentSummaryItem } from './UserAgentSummaryItem';
import { mountWithTheme } from '../../../utils/testHelpers';

describe('UserAgentSummaryItem', () => {
  describe('render', () => {
    const props = { original: 'Other' };

    it('renders', () => {
      expect(() =>
        mountWithTheme(<UserAgentSummaryItem {...props} />)
      ).not.toThrowError();
    });

    describe('with a version', () => {
      it('shows the version', () => {
        const p = { ...props, version: '1.0' };
        const wrapper = mountWithTheme(<UserAgentSummaryItem {...p} />);

        expect(wrapper.text()).toContain('(1.0)');
      });
    });
  });
});
