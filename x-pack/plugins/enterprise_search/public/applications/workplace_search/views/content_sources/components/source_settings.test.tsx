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

import { SourceSettings } from './source_settings';

describe('SourceSettings', () => {
  const updateContentSource = jest.fn();
  const removeContentSource = jest.fn();
  const getSourceConfigData = jest.fn();
  const contentSource = fullContentSources[0];
  const buttonLoading = false;
  const isOrganization = true;

  const mockValues = {
    contentSource,
    buttonLoading,
    sourceConfigData,
    isOrganization,
  };

  beforeEach(() => {
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
  });

  it('handles form submission', () => {
    const wrapper = shallow(<SourceSettings />);

    const TEXT = 'name';
    const input = wrapper.find('[data-test-subj="SourceNameInput"]');
    input.simulate('change', { target: { value: TEXT } });

    const preventDefault = jest.fn();
    wrapper.find('form').simulate('submit', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(updateContentSource).toHaveBeenCalledWith(fullContentSources[0].id, { name: TEXT });
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
        ...fullContentSources[0],
        serviceType: 'confluence_server',
      },
    });

    const wrapper = shallow(<SourceSettings />);

    expect(wrapper.find(SourceConfigFields).prop('publicKey')).toEqual(
      sourceConfigData.configuredFields.publicKey
    );
  });

  it('handles disabling synchronization', () => {
    const wrapper = shallow(<SourceSettings />);

    const synchronizeSwitch = wrapper.find('[data-test-subj="SynchronizeToggle"]').first();
    const event = { target: { checked: false } };
    synchronizeSwitch.prop('onChange')?.(event as any);

    wrapper.find('[data-test-subj="SaveSyncControlsButton"]').simulate('click');

    expect(updateContentSource).toHaveBeenCalledWith(fullContentSources[0].id, {
      indexing: {
        enabled: false,
        features: {
          content_extraction: { enabled: true },
          thumbnails: { enabled: true },
        },
      },
    });
  });

  it('handles disabling thumbnails', () => {
    const wrapper = shallow(<SourceSettings />);

    const thumbnailsSwitch = wrapper.find('[data-test-subj="ThumbnailsToggle"]').first();
    const event = { target: { checked: false } };
    thumbnailsSwitch.prop('onChange')?.(event as any);

    wrapper.find('[data-test-subj="SaveSyncControlsButton"]').simulate('click');

    expect(updateContentSource).toHaveBeenCalledWith(fullContentSources[0].id, {
      indexing: {
        enabled: true,
        features: {
          content_extraction: { enabled: true },
          thumbnails: { enabled: false },
        },
      },
    });
  });

  it('handles disabling content extraction', () => {
    const wrapper = shallow(<SourceSettings />);

    const contentExtractionSwitch = wrapper
      .find('[data-test-subj="ContentExtractionToggle"]')
      .first();
    const event = { target: { checked: false } };
    contentExtractionSwitch.prop('onChange')?.(event as any);

    wrapper.find('[data-test-subj="SaveSyncControlsButton"]').simulate('click');

    expect(updateContentSource).toHaveBeenCalledWith(fullContentSources[0].id, {
      indexing: {
        enabled: true,
        features: {
          content_extraction: { enabled: false },
          thumbnails: { enabled: true },
        },
      },
    });
  });

  it('disables the thumbnails switch when globally disabled', () => {
    setMockValues({
      ...mockValues,
      contentSource: {
        ...fullContentSources[0],
        areThumbnailsConfigEnabled: false,
      },
    });

    const wrapper = shallow(<SourceSettings />);

    const synchronizeSwitch = wrapper.find('[data-test-subj="ThumbnailsToggle"]');

    expect(synchronizeSwitch.prop('disabled')).toEqual(true);
  });

  describe('DownloadDiagnosticsButton', () => {
    it('renders for org with correct href', () => {
      const wrapper = shallow(<SourceSettings />);

      expect(wrapper.find('[data-test-subj="DownloadDiagnosticsButton"]').prop('href')).toEqual(
        '/api/workplace_search/org/sources/123/download_diagnostics'
      );
    });

    it('renders for account with correct href', () => {
      setMockValues({
        ...mockValues,
        isOrganization: false,
      });
      const wrapper = shallow(<SourceSettings />);

      expect(wrapper.find('[data-test-subj="DownloadDiagnosticsButton"]').prop('href')).toEqual(
        '/api/workplace_search/account/sources/123/download_diagnostics'
      );
    });

    it('renders with the correct download file name', () => {
      jest.spyOn(global.Date, 'now').mockImplementationOnce(() => new Date('1970-01-01').valueOf());

      const wrapper = shallow(<SourceSettings />);

      expect(wrapper.find('[data-test-subj="DownloadDiagnosticsButton"]').prop('download')).toEqual(
        '123_custom_0_diagnostics.json'
      );
    });
  });
});
