/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsService } from '@kbn/data-views-plugin/public';
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { DOC_TYPE } from '../../common';
import { Embeddable } from '../embeddable';
import { createOpenInDiscoverAction } from './open_in_discover_action';
import type { DiscoverAppLocator } from './open_in_discover_helpers';

describe('open in discover action', () => {
  describe('compatibility check', () => {
    it('is incompatible with non-lens embeddables', async () => {
      const embeddable = { type: 'NOT_LENS' } as IEmbeddable;

      const isCompatible = await createOpenInDiscoverAction(
        {} as DiscoverAppLocator,
        {} as DataViewsService,
        true
      ).isCompatible({
        embeddable,
      } as ActionExecutionContext<{ embeddable: IEmbeddable }>);

      expect(isCompatible).toBeFalsy();
    });
    it('is incompatible if user cant access Discover app', async () => {
      // setup
      const embeddable = { type: DOC_TYPE } as Embeddable;
      embeddable.canViewUnderlyingData = () => Promise.resolve(true);

      let hasDiscoverAccess = true;
      // make sure it would work if we had access to Discover
      expect(
        await createOpenInDiscoverAction(
          {} as DiscoverAppLocator,
          {} as DataViewsService,
          hasDiscoverAccess
        ).isCompatible({
          embeddable,
        } as unknown as ActionExecutionContext<{ embeddable: IEmbeddable }>)
      ).toBeTruthy();

      // make sure no Discover access makes the action incompatible
      hasDiscoverAccess = false;
      expect(
        await createOpenInDiscoverAction(
          {} as DiscoverAppLocator,
          {} as DataViewsService,
          hasDiscoverAccess
        ).isCompatible({
          embeddable,
        } as unknown as ActionExecutionContext<{ embeddable: IEmbeddable }>)
      ).toBeFalsy();
    });
    it('checks for ability to view underlying data if lens embeddable', async () => {
      // setup
      const embeddable = { type: DOC_TYPE } as Embeddable;

      // test false
      embeddable.canViewUnderlyingData = jest.fn(() => Promise.resolve(false));
      expect(
        await createOpenInDiscoverAction(
          {} as DiscoverAppLocator,
          {} as DataViewsService,
          true
        ).isCompatible({
          embeddable,
        } as unknown as ActionExecutionContext<{ embeddable: IEmbeddable }>)
      ).toBeFalsy();

      expect(embeddable.canViewUnderlyingData).toHaveBeenCalledTimes(1);

      // test true
      embeddable.canViewUnderlyingData = jest.fn(() => Promise.resolve(true));
      expect(
        await createOpenInDiscoverAction(
          {} as DiscoverAppLocator,
          {} as DataViewsService,
          true
        ).isCompatible({
          embeddable,
        } as unknown as ActionExecutionContext<{ embeddable: IEmbeddable }>)
      ).toBeTruthy();

      expect(embeddable.canViewUnderlyingData).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates to discover when executed', async () => {
    const viewUnderlyingDataArgs = {
      dataViewSpec: { id: 'index-pattern-id' },
      timeRange: {},
      filters: [],
      query: undefined,
      columns: [],
    };

    const embeddable = {
      getViewUnderlyingDataArgs: jest.fn(() => viewUnderlyingDataArgs),
      type: 'lens',
    };

    const discoverUrl = 'https://discover-redirect-url';
    const locator = {
      getRedirectUrl: jest.fn(() => discoverUrl),
    } as unknown as DiscoverAppLocator;

    globalThis.open = jest.fn();

    await createOpenInDiscoverAction(
      locator,
      {
        get: () => ({
          isTimeBased: () => true,
          toSpec: () => ({ id: 'index-pattern-id' }),
        }),
      } as unknown as DataViewsService,
      true
    ).execute({
      embeddable,
    } as unknown as ActionExecutionContext<{
      embeddable: IEmbeddable;
    }>);

    expect(embeddable.getViewUnderlyingDataArgs).toHaveBeenCalled();
    expect(locator.getRedirectUrl).toHaveBeenCalledWith(viewUnderlyingDataArgs);
    expect(globalThis.open).toHaveBeenCalledWith(discoverUrl, '_blank');
  });
});
