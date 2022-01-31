/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LogicMounter } from '../../../../../__mocks__/kea_logic';

import { CrawlSomeDomainsModalLogic } from './crawl_some_domains_modal_logic';

describe('CrawlSomeDomainsModalLogic', () => {
  const { mount } = new LogicMounter(CrawlSomeDomainsModalLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(CrawlSomeDomainsModalLogic.values).toEqual({
      isModalVisible: false,
      selectedDomainUrls: [],
    });
  });

  describe('actions', () => {
    describe('hideModal', () => {
      it('hides the modal', () => {
        CrawlSomeDomainsModalLogic.actions.hideModal();

        expect(CrawlSomeDomainsModalLogic.values.isModalVisible).toBe(false);
      });
    });

    describe('showModal', () => {
      it('shows the modal', () => {
        CrawlSomeDomainsModalLogic.actions.showModal();

        expect(CrawlSomeDomainsModalLogic.values.isModalVisible).toBe(true);
      });

      it('resets the selected options', () => {
        mount({
          selectedDomainUrls: ['https://www.elastic.co', 'https://www.swiftype.com'],
        });

        CrawlSomeDomainsModalLogic.actions.showModal();

        expect(CrawlSomeDomainsModalLogic.values.selectedDomainUrls).toEqual([]);
      });
    });

    describe('onSelectDomainUrls', () => {
      it('saves the urls', () => {
        mount({
          selectedDomainUrls: [],
        });

        CrawlSomeDomainsModalLogic.actions.onSelectDomainUrls([
          'https://www.elastic.co',
          'https://www.swiftype.com',
        ]);

        expect(CrawlSomeDomainsModalLogic.values.selectedDomainUrls).toEqual([
          'https://www.elastic.co',
          'https://www.swiftype.com',
        ]);
      });
    });
  });
});
