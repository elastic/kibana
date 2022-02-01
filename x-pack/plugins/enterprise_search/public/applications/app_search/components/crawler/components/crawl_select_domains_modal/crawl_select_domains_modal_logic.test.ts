/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LogicMounter } from '../../../../../__mocks__/kea_logic';

import { CrawlSelectDomainsModalLogic } from './crawl_select_domains_modal_logic';

describe('CrawlSelectDomainsModalLogic', () => {
  const { mount } = new LogicMounter(CrawlSelectDomainsModalLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(CrawlSelectDomainsModalLogic.values).toEqual({
      isModalVisible: false,
      selectedDomainUrls: [],
    });
  });

  describe('actions', () => {
    describe('hideModal', () => {
      it('hides the modal', () => {
        CrawlSelectDomainsModalLogic.actions.hideModal();

        expect(CrawlSelectDomainsModalLogic.values.isModalVisible).toBe(false);
      });
    });

    describe('showModal', () => {
      it('shows the modal', () => {
        CrawlSelectDomainsModalLogic.actions.showModal();

        expect(CrawlSelectDomainsModalLogic.values.isModalVisible).toBe(true);
      });

      it('resets the selected options', () => {
        mount({
          selectedDomainUrls: ['https://www.elastic.co', 'https://www.swiftype.com'],
        });

        CrawlSelectDomainsModalLogic.actions.showModal();

        expect(CrawlSelectDomainsModalLogic.values.selectedDomainUrls).toEqual([]);
      });
    });

    describe('onSelectDomainUrls', () => {
      it('saves the urls', () => {
        mount({
          selectedDomainUrls: [],
        });

        CrawlSelectDomainsModalLogic.actions.onSelectDomainUrls([
          'https://www.elastic.co',
          'https://www.swiftype.com',
        ]);

        expect(CrawlSelectDomainsModalLogic.values.selectedDomainUrls).toEqual([
          'https://www.elastic.co',
          'https://www.swiftype.com',
        ]);
      });
    });
  });
});
