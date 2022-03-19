/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverStart } from '../../../../../src/plugins/discover/public';
import type { IEmbeddable } from '../../../../../src/plugins/embeddable/public';
import { ActionExecutionContext } from '../../../../../src/plugins/ui_actions/public';
import { DOC_TYPE } from '../../common';
import { Embeddable } from '../embeddable';
import { createOpenInDiscoverAction } from './open_in_discover_action';

describe('open in discover action', () => {
  describe('compatibility check', () => {
    it('is incompatible with non-lens embeddables', async () => {
      const embeddable = { type: 'NOT_LENS' } as IEmbeddable;

      const isCompatible = await createOpenInDiscoverAction({} as DiscoverStart).isCompatible({
        embeddable,
      } as ActionExecutionContext<{ embeddable: IEmbeddable }>);

      expect(isCompatible).toBeFalsy();
    });
    it('checks for ability to view underlying data if lens embeddable', async () => {
      // setup
      const embeddable = { type: DOC_TYPE } as Embeddable;

      // test false
      embeddable.canViewUnderlyingData = jest.fn(() => Promise.resolve(false));
      expect(
        await createOpenInDiscoverAction({} as DiscoverStart).isCompatible({
          embeddable,
        } as unknown as ActionExecutionContext<{ embeddable: IEmbeddable }>)
      ).toBeFalsy();

      expect(embeddable.canViewUnderlyingData).toHaveBeenCalledTimes(1);

      // test true
      embeddable.canViewUnderlyingData = jest.fn(() => Promise.resolve(true));
      expect(
        await createOpenInDiscoverAction({} as DiscoverStart).isCompatible({
          embeddable,
        } as unknown as ActionExecutionContext<{ embeddable: IEmbeddable }>)
      ).toBeTruthy();

      expect(embeddable.canViewUnderlyingData).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates to discover when executed', async () => {
    const viewUnderlyingDataArgs = {
      indexPatternId: 'index-pattern-id',
      timeRange: {},
      filters: [],
      query: undefined,
      columns: [],
    };

    const embeddable = {
      getViewUnderlyingDataArgs: jest.fn(() => viewUnderlyingDataArgs),
    };

    const discoverUrl = 'https://discover-redirect-url';
    const discover = {
      locator: {
        getRedirectUrl: jest.fn(() => discoverUrl),
      },
    } as unknown as DiscoverStart;

    globalThis.open = jest.fn();

    await createOpenInDiscoverAction(discover).execute({
      embeddable,
    } as unknown as ActionExecutionContext<{
      embeddable: IEmbeddable;
    }>);

    expect(embeddable.getViewUnderlyingDataArgs).toHaveBeenCalled();
    expect(discover.locator!.getRedirectUrl).toHaveBeenCalledWith(viewUnderlyingDataArgs);
    expect(globalThis.open).toHaveBeenCalledWith(discoverUrl, '_blank');
  });
});
