/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues, setMockActions } from '../../../__mocks__';
import { unmountHandler } from '../../../__mocks__/shallow_useeffect.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiSwitch, EuiConfirmModal } from '@elastic/eui';
import { Loading } from '../../../shared/loading';

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

  it('renders on Basic license', () => {
    setMockValues({ ...mockValues, hasPlatinumLicense: false });
    const wrapper = shallow(<Security />);

    expect(wrapper.find(ViewContentHeader)).toHaveLength(1);
    expect(wrapper.find(EuiSwitch).prop('disabled')).toEqual(true);
  });

  it('renders on Platinum license', () => {
    const wrapper = shallow(<Security />);

    expect(wrapper.find(ViewContentHeader)).toHaveLength(1);
    expect(wrapper.find(EuiSwitch).prop('disabled')).toEqual(false);
  });

  it('returns Loading when loading', () => {
    setMockValues({ ...mockValues, dataLoading: true });
    const wrapper = shallow(<Security />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('handles window.onbeforeunload change', () => {
    setMockValues({ ...mockValues, unsavedChanges: true });
    shallow(<Security />);

    expect(window.onbeforeunload!({} as any)).toEqual(
      'Your private sources settings have not been saved. Are you sure you want to leave?'
    );
  });

  it('handles window.onbeforeunload unmount', () => {
    setMockValues({ ...mockValues, unsavedChanges: true });
    shallow(<Security />);

    unmountHandler();

    expect(window.onbeforeunload).toEqual(null);
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
