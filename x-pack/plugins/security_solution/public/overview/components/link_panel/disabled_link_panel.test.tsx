/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { TestProviders } from '../../../common/mock';
import { DisabledLinkPanel } from './disabled_link_panel';
import { ThreatIntelPanelView as TestView } from '../overview_cti_links/threat_intel_panel_view';

jest.mock('../../../common/lib/kibana');

describe('DisabledLinkPanel', () => {
  const defaultProps = {
    docLink: '/doclink',
    listItems: [],
    titleCopy: 'title',
    bodyCopy: 'body',
    buttonCopy: 'button',
    dataTestSubjPrefix: 'test-prefix',
    LinkPanelViewComponent: TestView,
  };

  it('renders expected children', () => {
    const wrapper = mount(
      <TestProviders>
        <DisabledLinkPanel {...defaultProps} />
      </TestProviders>
    );

    expect(
      wrapper.exists(
        '[data-test-subj="test-prefix-inner-panel-danger"] [data-test-subj="test-prefix-enable-module-button"]'
      )
    ).toEqual(true);
    expect(
      wrapper.find('[data-test-subj="test-prefix-enable-module-button"]').hostNodes().text()
    ).toEqual(defaultProps.buttonCopy);
    expect(wrapper.find('a').hostNodes().props().href).toEqual(defaultProps.docLink);
  });
});
