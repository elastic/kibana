/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/enterprise_search_url.mock';
import { mountWithIntl, setMockActions, setMockValues } from '../../../__mocks__';

import React from 'react';

import { EuiButton } from '@elastic/eui';

import { SampleEngineCreationCta } from './sample_engine_creation_cta';

describe('SampleEngineCTA', () => {
  describe('CTA button', () => {
    const MOCK_VALUES = {
      isLoading: false,
    };

    const MOCK_ACTIONS = {
      createSampleEngine: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      setMockActions(MOCK_ACTIONS);
      setMockValues(MOCK_VALUES);
    });

    it('calls createSampleEngine on click', () => {
      const wrapper = mountWithIntl(<SampleEngineCreationCta />);
      const ctaButton = wrapper.find(EuiButton);

      expect(ctaButton.props().onClick).toEqual(MOCK_ACTIONS.createSampleEngine);
    });

    it('by default enabled', () => {
      const wrapper = mountWithIntl(<SampleEngineCreationCta />);
      const ctaButton = wrapper.find(EuiButton);

      expect(ctaButton.props().isLoading).toEqual(false);
    });

    it('disabled while loading', () => {
      setMockValues({ ...MOCK_VALUES, isLoading: true });
      const wrapper = mountWithIntl(<SampleEngineCreationCta />);
      const ctaButton = wrapper.find(EuiButton);

      expect(ctaButton.props().isLoading).toEqual(true);
    });
  });
});
