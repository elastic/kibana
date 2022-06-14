/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';
import { fullContentSources, sourceConfigData } from '../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiConfirmModal } from '@elastic/eui';

import { SourceConfigFields } from '../../../components/shared/source_config_fields';

import { DownloadDiagnosticsButton } from './download_diagnostics_button';
import { SourceSettings } from './source_settings';

describe('SourceSettings', () => {
  const updateContentSource = jest.fn();
  const removeContentSource = jest.fn();
  const getSourceConfigData = jest.fn();
  const contentSource = fullContentSources[1];
  const buttonLoading = false;
  const isOrganization = true;

  const mockValues = {
    contentSource,
    buttonLoading,
    sourceConfigData,
    isOrganization,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ ...mockValues });
    setMockActions({
      updateContentSource,
      removeContentSource,
      getSourceConfigData,
    });
  });

  it('renders', () => {
    const wrapper = shallow(<SourceSettings />);

    expect(wrapper.find('form')).toHaveLength(1);
    expect(wrapper.find(DownloadDiagnosticsButton)).toHaveLength(1);
  });

  it('handles form submission', () => {
    const wrapper = shallow(<SourceSettings />);

    const TEXT = 'name';
    const input = wrapper.find('[data-test-subj="SourceNameInput"]');
    input.simulate('change', { target: { value: TEXT } });

    const preventDefault = jest.fn();
    wrapper.find('form').simulate('submit', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(updateContentSource).toHaveBeenCalledWith(contentSource.id, { name: TEXT });
  });

  it('handles confirmModal submission', () => {
    const wrapper = shallow(<SourceSettings />);
    wrapper.find('[data-test-subj="DeleteSourceButton"]').simulate('click');

    const modal = wrapper.find(EuiConfirmModal);
    modal.prop('onConfirm')!({} as any);
    modal.prop('onCancel')!({} as any);

    expect(removeContentSource).toHaveBeenCalled();
  });

  it('falls back when no configured fields sent', () => {
    setMockValues({ ...mockValues, sourceConfigData: {} });
    const wrapper = shallow(<SourceSettings />);

    expect(wrapper.find('form')).toHaveLength(1);
  });

  it('falls back when no consumerKey field sent', () => {
    setMockValues({ ...mockValues, sourceConfigData: { configuredFields: { clientId: '123' } } });
    const wrapper = shallow(<SourceSettings />);

    expect(wrapper.find(SourceConfigFields).prop('consumerKey')).toBeUndefined();
  });

  it('handles public key use case', () => {
    setMockValues({
      ...mockValues,
      contentSource: {
        ...contentSource,
        serviceType: 'confluence_server',
      },
    });

    const wrapper = shallow(<SourceSettings />);

    expect(wrapper.find(SourceConfigFields).prop('publicKey')).toEqual(
      sourceConfigData.configuredFields.publicKey
    );
  });

  it('hides source config for github apps', () => {
    setMockValues({
      ...mockValues,
      contentSource: {
        ...contentSource,
        serviceType: 'github_via_app',
        secret: {},
      },
    });

    const wrapper = shallow(<SourceSettings />);

    expect(wrapper.find(SourceConfigFields)).toHaveLength(0);
  });

  it('hides source config for github enterprise apps', () => {
    setMockValues({
      ...mockValues,
      contentSource: {
        ...contentSource,
        serviceType: 'github_enterprise_server_via_app',
        secret: {},
      },
    });

    const wrapper = shallow(<SourceSettings />);

    expect(wrapper.find(SourceConfigFields)).toHaveLength(0);
  });

  it('hides source config for custom sources', () => {
    setMockValues({
      ...mockValues,
      contentSource: {
        ...contentSource,
        serviceType: 'custom',
      },
    });

    const wrapper = shallow(<SourceSettings />);

    expect(wrapper.find(SourceConfigFields)).toHaveLength(0);
  });

  it('hides source config for non-organization sources', () => {
    setMockValues({
      ...mockValues,
      isOrganization: false,
    });

    const wrapper = shallow(<SourceSettings />);

    expect(wrapper.find(SourceConfigFields)).toHaveLength(0);
  });
});
