/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { EuiConfirmModal } from '@elastic/eui';

import { sourceConfigData } from '../../../__mocks__/content_sources.mock';

import { Loading } from '../../../../shared/loading';
import { SaveConfig } from '../../content_sources/components/add_source/save_config';
import { SourceConfig } from './source_config';

describe('SourceConfig', () => {
  const deleteSourceConfig = jest.fn();
  const getSourceConfigData = jest.fn();
  const saveSourceConfig = jest.fn();

  beforeEach(() => {
    setMockValues({ sourceConfigData, dataLoading: false });
    setMockActions({ deleteSourceConfig, getSourceConfigData, saveSourceConfig });
  });

  it('renders', () => {
    const wrapper = shallow(<SourceConfig sourceIndex={1} />);
    const saveConfig = wrapper.find(SaveConfig);

    // Trigger modal visibility
    saveConfig.prop('onDeleteConfig')!();

    expect(wrapper.find(EuiConfirmModal)).toHaveLength(1);
  });

  it('returns loading when loading', () => {
    setMockValues({
      sourceConfigData,
      dataLoading: true,
    });
    const wrapper = shallow(<SourceConfig sourceIndex={1} />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('handles delete click', () => {
    const wrapper = shallow(<SourceConfig sourceIndex={1} />);
    const saveConfig = wrapper.find(SaveConfig);

    // Trigger modal visibility
    saveConfig.prop('onDeleteConfig')!();

    wrapper.find(EuiConfirmModal).prop('onConfirm')!({} as any);

    expect(deleteSourceConfig).toHaveBeenCalled();
  });

  it('saves source config', () => {
    const wrapper = shallow(<SourceConfig sourceIndex={1} />);
    const saveConfig = wrapper.find(SaveConfig);

    // Trigger modal visibility
    saveConfig.prop('onDeleteConfig')!();

    saveConfig.prop('advanceStep')!();

    expect(saveSourceConfig).toHaveBeenCalled();
  });

  it('cancels and closes modal', () => {
    const wrapper = shallow(<SourceConfig sourceIndex={1} />);
    const saveConfig = wrapper.find(SaveConfig);

    // Trigger modal visibility
    saveConfig.prop('onDeleteConfig')!();

    wrapper.find(EuiConfirmModal).prop('onCancel')!({} as any);

    expect(wrapper.find(EuiConfirmModal)).toHaveLength(0);
  });
});
