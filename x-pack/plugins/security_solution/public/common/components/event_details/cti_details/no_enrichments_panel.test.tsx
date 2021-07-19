/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { NoEnrichmentsPanel } from './no_enrichments_panel';
import * as i18n from './translations';

jest.mock('../../../lib/kibana');

describe('NoEnrichmentsPanelView', () => {
  it('renders a qualified container', () => {
    const wrapper = mount(
      <NoEnrichmentsPanel
        isIndicatorMatchesPresent={true}
        isInvestigationTimeEnrichmentsPresent={false}
      />
    );
    expect(wrapper.find('[data-test-subj="no-enrichments-panel"]').exists()).toEqual(true);
  });

  it('renders nothing when all enrichments are present', () => {
    const wrapper = mount(
      <NoEnrichmentsPanel
        isIndicatorMatchesPresent={true}
        isInvestigationTimeEnrichmentsPresent={true}
      />
    );
    expect(wrapper.find('[data-test-subj="no-enrichments-panel"]').exists()).toEqual(false);
  });

  it('renders expected text when no enrichments are present', () => {
    const wrapper = mount(
      <NoEnrichmentsPanel
        isIndicatorMatchesPresent={false}
        isInvestigationTimeEnrichmentsPresent={false}
      />
    );
    expect(wrapper.find('[data-test-subj="no-enrichments-panel"]').hostNodes().text()).toContain(
      i18n.NO_ENRICHMENTS_FOUND_TITLE
    );
  });

  it('renders expected text when existing enrichments are absent', () => {
    const wrapper = mount(
      <NoEnrichmentsPanel
        isIndicatorMatchesPresent={false}
        isInvestigationTimeEnrichmentsPresent={true}
      />
    );
    expect(wrapper.find('[data-test-subj="no-enrichments-panel"]').hostNodes().text()).toContain(
      i18n.NO_INDICATOR_ENRICHMENTS_TITLE
    );
  });

  it('renders expected text when investigation enrichments are absent', () => {
    const wrapper = mount(
      <NoEnrichmentsPanel
        isIndicatorMatchesPresent={true}
        isInvestigationTimeEnrichmentsPresent={false}
      />
    );
    expect(wrapper.find('[data-test-subj="no-enrichments-panel"]').hostNodes().text()).toContain(
      i18n.NO_INVESTIGATION_ENRICHMENTS_TITLE
    );
  });
});
