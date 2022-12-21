/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import '../../../../../__mocks__/react_router';
import '../../../../__mocks__/engine_logic.mock';

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiButtonEmpty, EuiCallOut, EuiSwitch } from '@elastic/eui';

import { docLinks } from '../../../../../shared/doc_links';

import { Loading } from '../../../../../shared/loading';
import { EuiButtonTo } from '../../../../../shared/react_router_helpers';
import { DataPanel } from '../../../data_panel';
import { LogRetentionOptions } from '../../../log_retention';

import { CurationsSettings } from '.';

const MOCK_VALUES = {
  // CurationsSettingsLogic
  dataLoading: false,
  curationsSettings: {
    enabled: true,
    mode: 'automatic',
  },
  // LicensingLogic
  hasPlatinumLicense: true,
  // EngineLogic
  engine: {
    analytics_enabled: true,
  },
};

const MOCK_ACTIONS = {
  // CurationsSettingsLogic
  loadCurationsSettings: jest.fn(),
  onSkipLoadingCurationsSettings: jest.fn(),
  toggleCurationsEnabled: jest.fn(),
  toggleCurationsMode: jest.fn(),
};

describe('CurationsSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(MOCK_ACTIONS);
  });

  it('contains a switch to toggle curations settings', () => {
    let wrapper: ShallowWrapper;

    setMockValues({
      ...MOCK_VALUES,
      curationsSettings: { ...MOCK_VALUES.curationsSettings, enabled: true },
    });
    wrapper = shallow(<CurationsSettings />);

    expect(wrapper.find(EuiSwitch).at(0).prop('checked')).toBe(true);

    setMockValues({
      ...MOCK_VALUES,
      curationsSettings: { ...MOCK_VALUES.curationsSettings, enabled: false },
    });
    wrapper = shallow(<CurationsSettings />);

    expect(wrapper.find(EuiSwitch).at(0).prop('checked')).toBe(false);

    wrapper.find(EuiSwitch).at(0).simulate('change');
    expect(MOCK_ACTIONS.toggleCurationsEnabled).toHaveBeenCalled();
  });

  it('contains a switch to toggle the curations mode', () => {
    let wrapper: ShallowWrapper;

    setMockValues({
      ...MOCK_VALUES,
      curationsSettings: { ...MOCK_VALUES.curationsSettings, mode: 'automatic' },
    });
    wrapper = shallow(<CurationsSettings />);

    expect(wrapper.find(EuiSwitch).at(1).prop('checked')).toBe(true);

    setMockValues({
      ...MOCK_VALUES,
      curationsSettings: { ...MOCK_VALUES.curationsSettings, mode: 'manual' },
    });
    wrapper = shallow(<CurationsSettings />);

    expect(wrapper.find(EuiSwitch).at(1).prop('checked')).toBe(false);

    wrapper.find(EuiSwitch).at(1).simulate('change');
    expect(MOCK_ACTIONS.toggleCurationsMode).toHaveBeenCalled();
  });

  it('enables form elements and hides the callout when analytics retention is enabled', () => {
    setMockValues({
      ...MOCK_VALUES,
      logRetention: {
        [LogRetentionOptions.Analytics]: {
          enabled: true,
        },
      },
    });
    const wrapper = shallow(<CurationsSettings />);

    expect(wrapper.find(EuiSwitch).at(0).prop('disabled')).toBe(false);
    expect(wrapper.find(EuiSwitch).at(1).prop('disabled')).toBe(false);
    expect(wrapper.find(EuiCallOut)).toHaveLength(0);
  });

  it('display a callout and disables form elements when analytics retention is disabled', () => {
    setMockValues({
      ...MOCK_VALUES,
      engine: {
        analytics_enabled: false,
      },
    });
    const wrapper = shallow(<CurationsSettings />);

    expect(wrapper.find(EuiSwitch).at(0).prop('disabled')).toBe(true);
    expect(wrapper.find(EuiSwitch).at(1).prop('disabled')).toBe(true);
    expect(wrapper.find(EuiCallOut).dive().find(EuiButtonTo).prop('to')).toEqual('/settings');
  });

  it('returns a loading state when curations data is loading', () => {
    setMockValues({
      ...MOCK_VALUES,
      dataLoading: true,
    });
    const wrapper = shallow(<CurationsSettings />);

    expect(wrapper.is(Loading)).toBe(true);
  });

  describe('loading curation settings based on analytics logs availability', () => {
    it('loads curation settings when analytics logs are enabled', () => {
      shallow(<CurationsSettings />);

      expect(MOCK_ACTIONS.loadCurationsSettings).toHaveBeenCalledTimes(1);
    });

    it('skips loading curation settings when analytics logs are disabled', () => {
      setMockValues({
        ...MOCK_VALUES,
        engine: {
          analytics_enabled: false,
        },
      });

      shallow(<CurationsSettings />);

      expect(MOCK_ACTIONS.loadCurationsSettings).toHaveBeenCalledTimes(0);
      expect(MOCK_ACTIONS.onSkipLoadingCurationsSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the user has no platinum license', () => {
    beforeEach(() => {
      setMockValues({
        ...MOCK_VALUES,
        hasPlatinumLicense: false,
      });
    });

    it('shows a CTA to upgrade your license when the user when the user', () => {
      const wrapper = shallow(<CurationsSettings />);
      expect(wrapper.is(DataPanel)).toBe(true);
      expect(wrapper.prop('action').props.to).toEqual('/app/management/stack/license_management');
      expect(wrapper.find(EuiButtonEmpty).prop('href')).toEqual(docLinks.licenseManagement);
    });
  });
});
