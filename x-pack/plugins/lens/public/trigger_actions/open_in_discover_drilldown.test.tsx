/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FormEvent } from 'react';
import { IEmbeddable, EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { DiscoverSetup } from '@kbn/discover-plugin/public';
import { execute, isCompatible } from './open_in_discover_helpers';
import { mount } from 'enzyme';
import { Filter } from '@kbn/es-query';
import {
  ActionFactoryContext,
  CollectConfigProps,
  OpenInDiscoverDrilldown,
} from './open_in_discover_drilldown';
import { DataViewsService } from '@kbn/data-views-plugin/public';

jest.mock('./open_in_discover_helpers', () => ({
  isCompatible: jest.fn(() => true),
  execute: jest.fn(),
}));

describe('open in discover drilldown', () => {
  let drilldown: OpenInDiscoverDrilldown;
  beforeEach(() => {
    drilldown = new OpenInDiscoverDrilldown({
      discover: {} as DiscoverSetup,
      dataViews: () => ({} as DataViewsService),
      hasDiscoverAccess: () => true,
    });
  });
  it('provides UI to edit config', () => {
    const Component = (drilldown as unknown as { ReactCollectConfig: React.FC<CollectConfigProps> })
      .ReactCollectConfig;
    const setConfig = jest.fn();
    const instance = mount(
      <Component
        config={{ openInNewTab: false }}
        onConfig={setConfig}
        context={{} as ActionFactoryContext}
      />
    );
    instance.find('EuiSwitch').prop('onChange')!({} as unknown as FormEvent<{}>);
    expect(setConfig).toHaveBeenCalledWith({ openInNewTab: true });
  });
  it('calls through to isCompatible helper', () => {
    const filters: Filter[] = [{ meta: { disabled: false } }];
    drilldown.isCompatible(
      { openInNewTab: true },
      { embeddable: { type: 'lens' } as IEmbeddable<EmbeddableInput>, filters }
    );
    expect(isCompatible).toHaveBeenCalledWith(expect.objectContaining({ filters }));
  });
  it('calls through to execute helper', async () => {
    const filters: Filter[] = [{ meta: { disabled: false } }];
    await drilldown.execute(
      { openInNewTab: true },
      { embeddable: { type: 'lens' } as IEmbeddable<EmbeddableInput>, filters }
    );
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ filters, openInSameTab: false })
    );
  });
});
