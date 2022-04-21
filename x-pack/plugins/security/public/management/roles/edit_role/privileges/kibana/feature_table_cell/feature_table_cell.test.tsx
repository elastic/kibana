/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconTip } from '@elastic/eui';
import React from 'react';

import { mountWithIntl } from '@kbn/test-jest-helpers';

import { createFeature } from '../../../../__fixtures__/kibana_features';
import { SecuredFeature } from '../../../../model';
import { FeatureTableCell } from './feature_table_cell';

describe('FeatureTableCell', () => {
  it('renders the feature name', () => {
    const feature = createFeature({
      id: 'test-feature',
      name: 'Test Feature',
    });

    const wrapper = mountWithIntl(
      <FeatureTableCell feature={new SecuredFeature(feature.toRaw())} />
    );

    expect(wrapper.text()).toMatchInlineSnapshot(`"Test Feature "`);
    expect(wrapper.find(EuiIconTip)).toHaveLength(0);
  });

  it('renders a feature name with tooltip when configured', () => {
    const feature = createFeature({
      id: 'test-feature',
      name: 'Test Feature',
      privilegesTooltip: 'This is my awesome tooltip content',
    });

    const wrapper = mountWithIntl(
      <FeatureTableCell feature={new SecuredFeature(feature.toRaw())} />
    );

    expect(wrapper.text()).toMatchInlineSnapshot(`"Test Feature Info"`);

    expect(wrapper.find(EuiIconTip).props().content).toMatchInlineSnapshot(`
      <EuiText>
        <p>
          This is my awesome tooltip content
        </p>
      </EuiText>
    `);
  });
});
