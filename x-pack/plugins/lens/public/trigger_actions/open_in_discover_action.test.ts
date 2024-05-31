/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsService } from '@kbn/data-views-plugin/public';
import { type EmbeddableApiContext } from '@kbn/presentation-publishing';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { BehaviorSubject } from 'rxjs';
import { DOC_TYPE } from '../../common/constants';
import { createOpenInDiscoverAction } from './open_in_discover_action';
import type { DiscoverAppLocator } from './open_in_discover_helpers';

describe('open in discover action', () => {
  const compatibleEmbeddableApi = {
    type: DOC_TYPE,
    panelTitle: 'some title',
    hidePanelTitle: false,
    filters$: new BehaviorSubject([]),
    query$: new BehaviorSubject({ query: 'test', language: 'kuery' }),
    timeRange$: new BehaviorSubject({ from: 'now-15m', to: 'now' }),
    getSavedVis: jest.fn(() => undefined),
    canViewUnderlyingData: () => Promise.resolve(true),
    getViewUnderlyingDataArgs: jest.fn(() => ({
      dataViewSpec: { id: 'index-pattern-id' },
      timeRange: { from: 'now-7d', to: 'now' },
      filters: [],
      query: undefined,
      columns: [],
    })),
  };

  describe('compatibility check', () => {
    it('is incompatible with non-lens embeddables', async () => {
      const embeddable = { type: 'NOT_LENS' };

      const isCompatible = await createOpenInDiscoverAction(
        {} as DiscoverAppLocator,
        {} as DataViewsService,
        true
      ).isCompatible({
        embeddable,
      } as ActionExecutionContext<EmbeddableApiContext>);

      expect(isCompatible).toBeFalsy();
    });
    it('is incompatible if user cant access Discover app', async () => {
      // setup

      let hasDiscoverAccess = true;
      // make sure it would work if we had access to Discover
      expect(
        await createOpenInDiscoverAction(
          {} as DiscoverAppLocator,
          {} as DataViewsService,
          hasDiscoverAccess
        ).isCompatible({
          embeddable: compatibleEmbeddableApi,
        } as ActionExecutionContext<EmbeddableApiContext>)
      ).toBeTruthy();

      // make sure no Discover access makes the action incompatible
      hasDiscoverAccess = false;
      expect(
        await createOpenInDiscoverAction(
          {} as DiscoverAppLocator,
          {} as DataViewsService,
          hasDiscoverAccess
        ).isCompatible({
          embeddable: compatibleEmbeddableApi,
        } as ActionExecutionContext<EmbeddableApiContext>)
      ).toBeFalsy();
    });
    it('checks for ability to view underlying data if lens embeddable', async () => {
      // setup
      const embeddable = {
        ...compatibleEmbeddableApi,
        canViewUnderlyingData: jest.fn(() => Promise.resolve(false)),
        getViewUnderlyingDataArgs: jest.fn(() => undefined),
      };

      // test false
      expect(
        await createOpenInDiscoverAction(
          {} as DiscoverAppLocator,
          {} as DataViewsService,
          true
        ).isCompatible({
          embeddable,
        } as ActionExecutionContext<EmbeddableApiContext>)
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
        } as ActionExecutionContext<EmbeddableApiContext>)
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
      ...compatibleEmbeddableApi,
      getViewUnderlyingDataArgs: jest.fn(() => viewUnderlyingDataArgs),
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
    } as ActionExecutionContext<EmbeddableApiContext>);

    expect(embeddable.getViewUnderlyingDataArgs).toHaveBeenCalled();
    expect(locator.getRedirectUrl).toHaveBeenCalledWith(viewUnderlyingDataArgs);
    expect(globalThis.open).toHaveBeenCalledWith(discoverUrl, '_blank');
  });
});
