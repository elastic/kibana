/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, IToasts } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { SearchSource } from '@kbn/data-plugin/common';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { SavedSearch } from '@kbn/discover-plugin/public';
import { LicenseCheckState } from '@kbn/licensing-plugin/public';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import * as Rx from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import type { ReportingPublicPluginStartDendencies } from '../plugin';
import type { ActionContext } from './get_csv_panel_action';
import { ReportingCsvPanelAction } from './get_csv_panel_action';

const core = coreMock.createSetup();
let apiClient: ReportingAPIClient;

describe('GetCsvReportPanelAction', () => {
  let context: ActionContext;
  let mockLicenseState: LicenseCheckState;
  let mockSearchSource: SearchSource;
  let mockCoreStart: CoreStart;
  let mockStartDeps: ReportingPublicPluginStartDendencies & {
    toasts: IToasts;
    apiClient: ReportingAPIClient;
  };

  const mockLicense$ = () => {
    const license = licensingMock.createLicense();
    license.check = jest.fn(() => ({
      message: `check-foo state: ${mockLicenseState}`,
      state: mockLicenseState,
    }));
    return new Rx.BehaviorSubject(license);
  };

  beforeAll(() => {
    if (typeof window.URL.revokeObjectURL === 'undefined') {
      Object.defineProperty(window.URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: () => {},
      });
    }

    core.http.post.mockResolvedValue({ job: { id: '123-f000', payload: {} } });
  });

  beforeEach(() => {
    apiClient = new ReportingAPIClient(core.http, core.uiSettings, '7.15.0');
    jest.spyOn(apiClient, 'createReportingJob');

    mockLicenseState = 'valid';

    mockCoreStart = {
      ...core,
      application: { capabilities: { dashboard: { downloadCsv: true } } },
    } as unknown as CoreStart;

    mockStartDeps = {
      apiClient,
      data: dataPluginMock.createStartContract(),
      licensing: { ...licensingMock.createStart(), license$: mockLicense$() },
      toasts: mockCoreStart.notifications.toasts,
    } as unknown as typeof mockStartDeps;

    mockSearchSource = {
      createCopy: () => mockSearchSource,
      removeField: jest.fn(),
      setField: jest.fn(),
      getField: jest.fn(),
      getSerializedFields: jest.fn().mockImplementation(() => ({})),
    } as unknown as SearchSource;

    context = {
      embeddable: {
        type: 'search',
        getSavedSearch: () => {
          return { searchSource: mockSearchSource };
        },
        getTitle: () => `The Dude`,
        getInspectorAdapters: () => null,
        getInput: () => ({
          viewMode: 'list',
          timeRange: {
            to: 'now',
            from: 'now-7d',
          },
        }),
      },
    } as unknown as ActionContext;
  });

  it('translates empty embeddable context into job params', async () => {
    const panel = new ReportingCsvPanelAction({
      ...mockCoreStart,
      ...mockStartDeps,
      license: await firstValueFrom(mockStartDeps.licensing.license$),
      usesUiCapabilities: true,
    });

    await panel.execute(context);

    expect(apiClient.createReportingJob).toHaveBeenCalledWith('csv_searchsource', {
      browserTimezone: undefined,
      columns: [],
      objectType: 'search',
      searchSource: {},
      title: '',
      version: '7.15.0',
    });
  });

  it('translates embeddable context into job params', async () => {
    mockSearchSource = {
      createCopy: () => mockSearchSource,
      removeField: jest.fn(),
      setField: jest.fn(),
      getField: jest.fn(),
      getSerializedFields: jest.fn().mockImplementation(() => ({ testData: 'testDataValue' })),
    } as unknown as SearchSource;
    context.embeddable.getSavedSearch = () => {
      return {
        searchSource: mockSearchSource,
        columns: ['column_a', 'column_b'],
      } as unknown as SavedSearch;
    };

    const panel = new ReportingCsvPanelAction({
      ...mockCoreStart,
      ...mockStartDeps,
      license: await firstValueFrom(mockStartDeps.licensing.license$),
      usesUiCapabilities: true,
    });

    await panel.execute(context);

    expect(apiClient.createReportingJob).toHaveBeenCalledWith('csv_searchsource', {
      browserTimezone: undefined,
      columns: ['column_a', 'column_b'],
      objectType: 'search',
      searchSource: { testData: 'testDataValue' },
      title: '',
      version: '7.15.0',
    });
  });

  it('allows downloading for valid licenses', async () => {
    const panel = new ReportingCsvPanelAction({
      ...mockCoreStart,
      ...mockStartDeps,
      license: await firstValueFrom(mockStartDeps.licensing.license$),
      usesUiCapabilities: true,
    });

    await panel.execute(context);

    expect(core.http.post).toHaveBeenCalled();
  });

  it('shows a good old toastie when it successfully starts', async () => {
    const panel = new ReportingCsvPanelAction({
      ...mockCoreStart,
      ...mockStartDeps,
      license: await firstValueFrom(mockStartDeps.licensing.license$),
      usesUiCapabilities: true,
    });

    await panel.execute(context);

    expect(core.notifications.toasts.addSuccess).toHaveBeenCalled();
    expect(core.notifications.toasts.addDanger).not.toHaveBeenCalled();
  });

  it('shows a bad old toastie when it successfully fails', async () => {
    apiClient.createReportingJob = jest.fn().mockRejectedValue('No more ram!');
    const panel = new ReportingCsvPanelAction({
      ...mockCoreStart,
      ...mockStartDeps,
      license: await firstValueFrom(mockStartDeps.licensing.license$),
      usesUiCapabilities: true,
    });

    await panel.execute(context);

    expect(mockStartDeps.toasts.addError).toHaveBeenCalled();
  });

  it(`doesn't allow downloads with bad licenses`, async () => {
    mockLicenseState = 'invalid';

    const plugin = new ReportingCsvPanelAction({
      ...mockCoreStart,
      ...mockStartDeps,
      license: await firstValueFrom(mockStartDeps.licensing.license$),
      usesUiCapabilities: true,
    });

    expect(await plugin.isCompatible(context)).toEqual(false);
  });

  it('sets a display and icon type', async () => {
    const panel = new ReportingCsvPanelAction({
      ...mockCoreStart,
      ...mockStartDeps,
      license: await firstValueFrom(mockStartDeps.licensing.license$),
      usesUiCapabilities: true,
    });

    expect(panel.getIconType()).toMatchInlineSnapshot(`"document"`);
    expect(panel.getDisplayName()).toMatchInlineSnapshot(`"Generate CSV report"`);
  });

  describe('Application UI Capabilities', () => {
    it(`doesn't allow downloads when UI capability is not enabled`, async () => {
      mockCoreStart.application = { capabilities: {} } as CoreStart['application'];
      const plugin = new ReportingCsvPanelAction({
        ...mockCoreStart,
        ...mockStartDeps,
        license: await firstValueFrom(mockStartDeps.licensing.license$),
        usesUiCapabilities: true,
      });

      expect(await plugin.isCompatible(context)).toEqual(false);
    });

    it(`allows downloads when license is valid and UI capability is enabled`, async () => {
      const plugin = new ReportingCsvPanelAction({
        ...mockCoreStart,
        ...mockStartDeps,
        license: await firstValueFrom(mockStartDeps.licensing.license$),
        usesUiCapabilities: true,
      });

      expect(await plugin.isCompatible(context)).toEqual(true);
    });

    it(`allows download when license is valid and deprecated roles config is enabled`, async () => {
      const plugin = new ReportingCsvPanelAction({
        ...mockCoreStart,
        ...mockStartDeps,
        license: await firstValueFrom(mockStartDeps.licensing.license$),
        usesUiCapabilities: false,
      });

      expect(await plugin.isCompatible(context)).toEqual(true);
    });
  });
});
