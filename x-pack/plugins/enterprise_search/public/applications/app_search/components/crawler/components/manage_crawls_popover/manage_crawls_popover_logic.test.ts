/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockHttpValues,
  mockFlashMessageHelpers,
} from '../../../../../__mocks__/kea_logic';
import '../../../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { CrawlerDomain } from '../../types';

import { ManageCrawlsPopoverLogic } from './manage_crawls_popover_logic';

describe('ManageCrawlsPopoverLogic', () => {
  const { mount } = new LogicMounter(ManageCrawlsPopoverLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors, flashSuccessToast } = mockFlashMessageHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();

    expect(ManageCrawlsPopoverLogic.values).toEqual({
      isOpen: false,
    });
  });

  describe('actions', () => {
    describe('closePopover', () => {
      it('closes the popover', () => {
        mount({
          isOpen: true,
        });

        ManageCrawlsPopoverLogic.actions.closePopover();

        expect(ManageCrawlsPopoverLogic.values.isOpen).toEqual(false);
      });
    });

    describe('togglePopover', () => {
      it('toggles the visibility of the popover', () => {
        mount({
          isOpen: false,
        });

        ManageCrawlsPopoverLogic.actions.togglePopover();

        expect(ManageCrawlsPopoverLogic.values.isOpen).toEqual(true);

        ManageCrawlsPopoverLogic.actions.togglePopover();

        expect(ManageCrawlsPopoverLogic.values.isOpen).toEqual(false);
      });
    });
  });

  describe('listeners', () => {
    describe('reApplyCrawlRules', () => {
      it('flashes a success toast on success', async () => {
        jest.spyOn(ManageCrawlsPopoverLogic.actions, 'closePopover');
        http.post.mockReturnValueOnce(Promise.resolve());

        ManageCrawlsPopoverLogic.actions.reApplyCrawlRules({
          url: 'https://elastic.co',
        } as CrawlerDomain);
        await nextTick();

        expect(flashSuccessToast).toHaveBeenCalledWith(expect.any(String));
        expect(ManageCrawlsPopoverLogic.actions.closePopover).toHaveBeenCalled();
      });

      it('flashes an error callout if there is an error', async () => {
        jest.spyOn(ManageCrawlsPopoverLogic.actions, 'closePopover');
        http.post.mockReturnValueOnce(Promise.reject('error'));

        ManageCrawlsPopoverLogic.actions.reApplyCrawlRules();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
        expect(ManageCrawlsPopoverLogic.actions.closePopover).toHaveBeenCalled();
      });
    });
  });
});
