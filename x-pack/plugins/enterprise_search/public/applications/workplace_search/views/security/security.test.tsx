/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSwitch, EuiConfirmModal } from '@elastic/eui';

import { SetWorkplaceSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';

import { Loading } from '../../../shared/loading';
import { UnsavedChangesPrompt } from '../../../shared/unsaved_changes_prompt';
import { ViewContentHeader } from '../../components/shared/view_content_header';

import { Security } from './security';

describe('Security', () => {
  const initializeSourceRestrictions = jest.fn();
  const updatePrivateSourcesEnabled = jest.fn();
  const updateRemoteEnabled = jest.fn();
  const updateRemoteSource = jest.fn();
  const updateStandardEnabled = jest.fn();
  const updateStandardSource = jest.fn();
  const saveSourceRestrictions = jest.fn();
  const resetState = jest.fn();

  const mockValues = {
    isEnabled: true,
    remote: { isEnabled: true, contentSources: [] },
    standard: { isEnabled: true, contentSources: [] },
    dataLoading: false,
    unsavedChanges: false,
    hasPlatinumLicense: true,
  };

  beforeEach(() => {
    setMockValues(mockValues);
    setMockActions({
      initializeSourceRestrictions,
      updatePrivateSourcesEnabled,
      updateRemoteEnabled,
      updateRemoteSource,
      updateStandardEnabled,
      updateStandardSource,
      saveSourceRestrictions,
      resetState,
    });
  });

  it('renders', () => {
    setMockValues({ ...mockValues, hasPlatinumLicense: false });
    const wrapper = shallow(<Security />);

    expect(wrapper.find(SetPageChrome)).toHaveLength(1);
    expect(wrapper.find(UnsavedChangesPrompt)).toHaveLength(1);
    expect(wrapper.find(ViewContentHeader)).toHaveLength(1);
    expect(wrapper.find(EuiSwitch).prop('disabled')).toEqual(true);
  });

  it('does not disable switch on Platinum license', () => {
    const wrapper = shallow(<Security />);

    expect(wrapper.find(EuiSwitch).prop('disabled')).toEqual(false);
  });

  it('returns Loading when loading', () => {
    setMockValues({ ...mockValues, dataLoading: true });
    const wrapper = shallow(<Security />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('handles switch click', () => {
    const wrapper = shallow(<Security />);

    const privateSourcesSwitch = wrapper.find(EuiSwitch);
    const event = { target: { checked: true } };
    privateSourcesSwitch.prop('onChange')(event as any);

    expect(updatePrivateSourcesEnabled).toHaveBeenCalled();
  });

  it('handles confirmModal submission', () => {
    setMockValues({ ...mockValues, unsavedChanges: true });
    const wrapper = shallow(<Security />);

    const header = wrapper.find(ViewContentHeader).dive();
    header.find('[data-test-subj="SaveSettingsButton"]').prop('onClick')!({} as any);
    const modal = wrapper.find(EuiConfirmModal);
    modal.prop('onConfirm')!({} as any);

    expect(saveSourceRestrictions).toHaveBeenCalled();
  });
});
