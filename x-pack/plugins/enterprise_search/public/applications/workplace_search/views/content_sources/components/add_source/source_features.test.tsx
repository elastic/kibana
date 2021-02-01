/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountAsync, setMockValues } from '../../../../../__mocks__';

import React from 'react';

import { EuiPanel } from '@elastic/eui';

import { SourceFeatures } from './source_features';

import { staticSourceData } from '../../source_data';

describe('SourceFeatures', () => {
  const { features, objTypes } = staticSourceData[0];

  const props = {
    features,
    objTypes,
    name: 'foo',
  };

  it('renders hasPlatinumLicense & isOrganization', async () => {
    setMockValues({ hasPlatinumLicense: true, isOrganization: true });
    const wrapper = await mountAsync(<SourceFeatures {...props} />, { i18n: true });

    expect(wrapper.find('FeaturesRouter[featureId="SyncFrequency"]')).toHaveLength(1);
    expect(wrapper.find('FeaturesRouter[featureId="SyncedItems"]')).toHaveLength(1);
  });

  it('renders !hasPlatinumLicense & isOrganization', async () => {
    setMockValues({ hasPlatinumLicense: false, isOrganization: true });
    const wrapper = await mountAsync(<SourceFeatures {...props} />, { i18n: true });

    expect(wrapper.find('FeaturesRouter[featureId="SyncFrequency"]')).toHaveLength(1);
    expect(wrapper.find('FeaturesRouter[featureId="SyncedItems"]')).toHaveLength(1);
    expect(wrapper.find('FeaturesRouter[featureId="GlobalAccessPermissions"]')).toHaveLength(1);
  });

  it('renders hasPlatinumLicense & !isOrganization', async () => {
    setMockValues({ hasPlatinumLicense: true, isOrganization: false });
    const wrapper = await mountAsync(<SourceFeatures {...props} />, { i18n: true });

    expect(wrapper.find('FeaturesRouter[featureId="Private"]')).toHaveLength(1);
    expect(wrapper.find('FeaturesRouter[featureId="SyncedItems"]')).toHaveLength(1);
    expect(wrapper.find('FeaturesRouter[featureId="SyncedItems"]')).toHaveLength(1);
  });

  it('renders !hasPlatinumLicense & !isOrganization', async () => {
    setMockValues({ hasPlatinumLicense: false, isOrganization: false });
    const wrapper = await mountAsync(<SourceFeatures {...props} />, { i18n: true });

    expect(wrapper.find('IncludedFeatures').find(EuiPanel)).toHaveLength(0);
  });
});
