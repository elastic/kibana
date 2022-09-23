/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import React from 'react';

import { mount } from 'enzyme';

import { EuiCodeBlock, EuiDescriptionListDescription } from '@elastic/eui';

import { AnalyticsCollection } from '../../../../../common/types/analytics';

import { AnalyticsCollectionIntegrate } from './analytics_collection_integrate';

describe('AnalyticsCollectionIntegrate', () => {
  const analyticsCollections: AnalyticsCollection = {
    event_retention_day_length: 180,
    id: '1',
    name: 'example',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = mount(<AnalyticsCollectionIntegrate collection={analyticsCollections} />);
    expect(wrapper.find(EuiCodeBlock)).toHaveLength(2);
    expect(wrapper.find(EuiDescriptionListDescription).get(0)).toMatchInlineSnapshot(`
      <EuiDescriptionListDescription>
        example
      </EuiDescriptionListDescription>
    `);

    expect(wrapper.find(EuiDescriptionListDescription).get(1)).toMatchInlineSnapshot(`
          <EuiDescriptionListDescription>
            /analytics/api/collections/example
          </EuiDescriptionListDescription>
      `);
  });
});
