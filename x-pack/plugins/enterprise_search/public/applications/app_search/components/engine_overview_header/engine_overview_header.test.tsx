/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EngineOverviewHeader } from '../engine_overview_header';
import { mountWithKibanaContext } from '../../../test_utils/helpers';

describe('EngineOverviewHeader', () => {
  describe('when enterpriseSearchUrl is set', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = mountWithKibanaContext(<EngineOverviewHeader />, {
        enterpriseSearchUrl: 'http://localhost:3002',
      });
    });

    describe('the Launch App Search button', () => {
      const subject = () => wrapper.find('EuiButton[data-test-subj="launchButton"]');

      it('should not be disabled', () => {
        expect(subject().props().isDisabled).toBeFalsy();
      });

      it('should use the enterpriseSearchUrl as the base path for its href', () => {
        expect(subject().props().href).toBe('http://localhost:3002/as');
      });
    });
  });

  describe('when enterpriseSearchUrl is not set', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = mountWithKibanaContext(<EngineOverviewHeader />, {
        enterpriseSearchUrl: undefined,
      });
    });

    describe('the Launch App Search button', () => {
      const subject = () => wrapper.find('EuiButton[data-test-subj="launchButton"]');

      it('should be disabled', () => {
        expect(subject().props().isDisabled).toBe(true);
      });

      it('should not have an href', () => {
        expect(subject().props().href).toBeUndefined();
      });
    });
  });
});
