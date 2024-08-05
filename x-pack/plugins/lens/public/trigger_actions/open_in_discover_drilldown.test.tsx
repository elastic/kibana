/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ApplicationStart } from '@kbn/core/public';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiscoverAppLocator, getHref, isCompatible } from './open_in_discover_helpers';
import { Filter } from '@kbn/es-query';
import {
  ActionFactoryContext,
  CollectConfigProps,
  OpenInDiscoverDrilldown,
} from './open_in_discover_drilldown';
import { DataViewsService } from '@kbn/data-views-plugin/public';
import { LensApi } from '../embeddable';

jest.mock('./open_in_discover_helpers', () => ({
  isCompatible: jest.fn(() => true),
  getHref: jest.fn(),
}));

describe('open in discover drilldown', () => {
  let drilldown: OpenInDiscoverDrilldown;
  const originalOpen = window.open;

  // Prevent the JSDOM error about missing "window.open"
  beforeAll(() => {
    window.open = jest.fn();
  });

  beforeEach(() => {
    drilldown = new OpenInDiscoverDrilldown({
      locator: () => ({} as DiscoverAppLocator),
      dataViews: () => ({} as DataViewsService),
      hasDiscoverAccess: () => true,
      application: () => ({} as ApplicationStart),
    });
  });

  afterAll(() => {
    window.open = originalOpen;
  });

  it('provides UI to edit config', () => {
    const Component = (drilldown as unknown as { ReactCollectConfig: React.FC<CollectConfigProps> })
      .ReactCollectConfig;
    const setConfig = jest.fn();
    render(
      <Component
        config={{ openInNewTab: false }}
        onConfig={setConfig}
        context={{} as ActionFactoryContext}
      />
    );
    userEvent.click(screen.getByRole('switch'));
    expect(setConfig).toHaveBeenCalledWith({ openInNewTab: true });
  });

  it('calls through to isCompatible helper', async () => {
    const filters: Filter[] = [{ meta: { disabled: false } }];
    await drilldown.isCompatible(
      { openInNewTab: true },
      { embeddable: { type: 'lens' } as LensApi, filters }
    );
    expect(isCompatible).toHaveBeenCalledWith(expect.objectContaining({ filters }));
  });

  it('calls through to getHref helper', async () => {
    const filters: Filter[] = [{ meta: { disabled: false } }];
    await drilldown.execute(
      { openInNewTab: true },
      { embeddable: { type: 'lens' } as LensApi, filters }
    );
    expect(getHref).toHaveBeenCalledWith(expect.objectContaining({ filters }));
  });
});
