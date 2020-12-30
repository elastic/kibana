/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createFeature } from '../../../../__fixtures__/kibana_features';
import { mountWithIntl } from '@kbn/test/jest';
import { FeatureTableCell } from '.';
import { SecuredFeature } from '../../../../model';
import { EuiIconTip } from '@elastic/eui';

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

    expect(wrapper.text()).toMatchInlineSnapshot(`"Test Feature "`);

    expect(wrapper.find(EuiIconTip).props().content).toMatchInlineSnapshot(`
      <EuiText>
        <p>
          This is my awesome tooltip content
        </p>
      </EuiText>
    `);
  });
});
