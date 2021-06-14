/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setMockValues } from '../../../__mocks__/kea_logic';
import { mockEngineValues } from '../../__mocks__';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { docLinks } from '../../../shared/doc_links';

import { CrawlerLanding } from './crawler_landing';

describe('CrawlerLanding', () => {
  let wrapper: ShallowWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ ...mockEngineValues });
    wrapper = shallow(<CrawlerLanding />);
  });

  it('contains an external documentation link', () => {
    const externalDocumentationLink = wrapper.find('[data-test-subj="CrawlerDocumentationLink"]');

    expect(externalDocumentationLink.prop('href')).toBe(
      `${docLinks.appSearchBase}/web-crawler.html`
    );
  });

  it('contains a link to standalone App Search', () => {
    const externalDocumentationLink = wrapper.find('[data-test-subj="CrawlerStandaloneLink"]');

    expect(externalDocumentationLink.prop('href')).toBe('/as/engines/some-engine/crawler');
  });
});
