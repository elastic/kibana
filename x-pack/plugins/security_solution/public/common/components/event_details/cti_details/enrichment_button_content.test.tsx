/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { EnrichmentButtonContent } from './enrichment_button_content';

describe('EnrichmentButtonContent', () => {
  it('renders string with feedName if feedName is present', () => {
    const wrapper = mount(
      <EnrichmentButtonContent field={'source.ip'} value={'127.0.0.1'} feedName={'eceintel'} />
    );
    expect(wrapper.find('[data-test-subj="enrichment-button-content"]').hostNodes().text()).toEqual(
      'source.ip 127.0.0.1 from eceintel'
    );
  });

  it('renders string without feedName if feedName is not present', () => {
    const wrapper = mount(<EnrichmentButtonContent field={'source.ip'} value={'127.0.0.1'} />);
    expect(wrapper.find('[data-test-subj="enrichment-button-content"]').hostNodes().text()).toEqual(
      'source.ip 127.0.0.1'
    );
  });
});
