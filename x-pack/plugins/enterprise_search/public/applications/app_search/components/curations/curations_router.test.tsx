/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import '../../../__mocks__/react_router';
import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';
import '../../__mocks__/engine_logic.mock';

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { shallow } from 'enzyme';

import { LogRetentionOptions } from '../log_retention';

import { CurationsRouter } from './';

const MOCK_VALUES = {
  // CurationsSettingsLogic
  dataLoading: false,
  curationsSettings: {
    enabled: true,
    mode: 'automatic',
  },
  // LogRetentionLogic
  logRetention: {
    [LogRetentionOptions.Analytics]: {
      enabled: true,
    },
  },
  // LicensingLogic
  hasPlatinumLicense: true,
};

const MOCK_ACTIONS = {
  // CurationsSettingsLogic
  loadCurationsSettings: jest.fn(),
  onSkipLoadingCurationsSettings: jest.fn(),
  // LogRetentionLogic
  fetchLogRetention: jest.fn(),
};

describe('CurationsRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(MOCK_ACTIONS);
  });

  it('renders', () => {
    const wrapper = shallow(<CurationsRouter />);

    expect(wrapper.find(Switch)).toHaveLength(1);
    expect(wrapper.find(Route)).toHaveLength(4);
  });

  it('loads log retention settings', () => {
    setMockValues(MOCK_VALUES);
    shallow(<CurationsRouter />);

    expect(MOCK_ACTIONS.fetchLogRetention).toHaveBeenCalled();
  });

  describe('when the user has no platinum license', () => {
    beforeEach(() => {
      setMockValues({
        ...MOCK_VALUES,
        hasPlatinumLicense: false,
      });
    });

    it('it does not fetch log retention', () => {
      shallow(<CurationsRouter />);
      expect(MOCK_ACTIONS.fetchLogRetention).toHaveBeenCalledTimes(0);
    });
  });

  describe('loading curation settings based on log retention', () => {
    it('loads curation settings when log retention is enabled', () => {
      setMockValues({
        ...MOCK_VALUES,
        logRetention: {
          [LogRetentionOptions.Analytics]: {
            enabled: true,
          },
        },
      });

      shallow(<CurationsRouter />);

      expect(MOCK_ACTIONS.loadCurationsSettings).toHaveBeenCalledTimes(1);
    });

    it('skips loading curation settings when log retention is disabled', () => {
      setMockValues({
        ...MOCK_VALUES,
        logRetention: {
          [LogRetentionOptions.Analytics]: {
            enabled: false,
          },
        },
      });

      shallow(<CurationsRouter />);

      expect(MOCK_ACTIONS.onSkipLoadingCurationsSettings).toHaveBeenCalledTimes(1);
    });

    it('takes no action if log retention has not yet been loaded', () => {
      setMockValues({
        ...MOCK_VALUES,
        logRetention: null,
      });

      shallow(<CurationsRouter />);

      expect(MOCK_ACTIONS.loadCurationsSettings).toHaveBeenCalledTimes(0);
      expect(MOCK_ACTIONS.onSkipLoadingCurationsSettings).toHaveBeenCalledTimes(0);
    });
  });
});
