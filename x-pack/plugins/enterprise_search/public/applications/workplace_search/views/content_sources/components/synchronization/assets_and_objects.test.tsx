/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';
import { fullContentSources } from '../../../../__mocks__/content_sources.mock';
import { blockedWindow } from './__mocks__/synchronization.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSwitch } from '@elastic/eui';

import { AssetsAndObjects } from './assets_and_objects';

describe('AssetsAndObjects', () => {
  const setThumbnailsChecked = jest.fn();
  const setContentExtractionChecked = jest.fn();
  const updateAssetsAndObjectsSettings = jest.fn();
  const resetSyncSettings = jest.fn();
  const contentSource = fullContentSources[0];

  const mockActions = {
    setThumbnailsChecked,
    setContentExtractionChecked,
    updateAssetsAndObjectsSettings,
    resetSyncSettings,
  };
  const mockValues = {
    dataLoading: false,
    blockedWindows: [blockedWindow],
    contentSource,
    thumbnailsChecked: true,
    contentExtractionChecked: true,
    hasUnsavedAssetsAndObjectsChanges: false,
  };

  beforeEach(() => {
    setMockActions(mockActions);
    setMockValues(mockValues);
  });

  it('renders', () => {
    const wrapper = shallow(<AssetsAndObjects />);

    expect(wrapper.find(EuiSwitch)).toHaveLength(2);
  });

  it('handles thumbnails switch change', () => {
    const wrapper = shallow(<AssetsAndObjects />);
    wrapper
      .find('[data-test-subj="ThumbnailsToggle"]')
      .simulate('change', { target: { checked: false } });

    expect(setThumbnailsChecked).toHaveBeenCalledWith(false);
  });

  it('handles content extraction switch change', () => {
    const wrapper = shallow(<AssetsAndObjects />);
    wrapper
      .find('[data-test-subj="ContentExtractionToggle"]')
      .simulate('change', { target: { checked: false } });

    expect(setContentExtractionChecked).toHaveBeenCalledWith(false);
  });

  it('renders correct text when areThumbnailsConfigEnabled is false', () => {
    setMockValues({
      ...mockValues,
      contentSource: {
        ...contentSource,
        areThumbnailsConfigEnabled: false,
      },
    });
    const wrapper = shallow(<AssetsAndObjects />);

    expect(wrapper.find('[data-test-subj="ThumbnailsToggle"]').prop('label')).toEqual(
      'Sync thumbnails - disabled at global configuration level'
    );
  });
});
