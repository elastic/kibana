/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { first } from 'rxjs/operators';
import { CoreStart } from '@kbn/core/public';
import type { SearchSource } from '@kbn/data-plugin/common';
import type { SavedSearch } from '@kbn/discover-plugin/public';
import { LicenseCheckState } from '@kbn/licensing-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
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
  let mockStartServicesPayload: [CoreStart, ReportingPublicPluginStartDendencies, unknown];
  let mockStartServices$: Rx.Observable<typeof mockStartServicesPayload>;

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

    core.http.post.mockResolvedValue({});
  });

  beforeEach(() => {
    apiClient = new ReportingAPIClient(core.http, core.uiSettings, '7.15.0');
    jest.spyOn(apiClient, 'createImmediateReport');

    mockLicenseState = 'valid';

    mockStartServicesPayload = [
      {
        ...core,
        application: { capabilities: { dashboard: { downloadCsv: true } } },
      } as unknown as CoreStart,
      {
        data: dataPluginMock.createStartContract(),
        licensing: { ...licensingMock.createStart(), license$: mockLicense$() },
      } as unknown as ReportingPublicPluginStartDendencies,
      null,
    ];
    mockStartServices$ = Rx.from(Promise.resolve(mockStartServicesPayload));

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
      core,
      apiClient,
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
    });

    await mockStartServices$.pipe(first()).toPromise();

    await panel.execute(context);

    expect(apiClient.createImmediateReport).toHaveBeenCalledWith({
      browserTimezone: undefined,
      columns: [],
      objectType: 'downloadCsv',
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
      core,
      apiClient,
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
    });

    await mockStartServices$.pipe(first()).toPromise();

    await panel.execute(context);

    expect(apiClient.createImmediateReport).toHaveBeenCalledWith({
      browserTimezone: undefined,
      columns: ['column_a', 'column_b'],
      objectType: 'downloadCsv',
      searchSource: { testData: 'testDataValue' },
      title: '',
      version: '7.15.0',
    });
  });

  it('allows downloading for valid licenses', async () => {
    const panel = new ReportingCsvPanelAction({
      core,
      apiClient,
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
    });

    await mockStartServices$.pipe(first()).toPromise();

    await panel.execute(context);

    expect(core.http.post).toHaveBeenCalled();
  });

  it('shows a good old toastie when it successfully starts', async () => {
    const panel = new ReportingCsvPanelAction({
      core,
      apiClient,
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
    });

    await mockStartServices$.pipe(first()).toPromise();

    await panel.execute(context);

    expect(core.notifications.toasts.addSuccess).toHaveBeenCalled();
    expect(core.notifications.toasts.addDanger).not.toHaveBeenCalled();
  });

  it('shows a bad old toastie when it successfully fails', async () => {
    apiClient.createImmediateReport = jest.fn().mockRejectedValue('No more ram!');
    const panel = new ReportingCsvPanelAction({
      core,
      apiClient,
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
    });

    await mockStartServices$.pipe(first()).toPromise();

    await panel.execute(context);

    expect(core.notifications.toasts.addDanger).toHaveBeenCalled();
  });

  it(`doesn't allow downloads with bad licenses`, async () => {
    mockLicenseState = 'invalid';

    const plugin = new ReportingCsvPanelAction({
      core,
      apiClient,
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
    });

    await mockStartServices$.pipe(first()).toPromise();
    expect(await plugin.isCompatible(context)).toEqual(false);
  });

  it('sets a display and icon type', async () => {
    const panel = new ReportingCsvPanelAction({
      core,
      apiClient,
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
    });

    await mockStartServices$.pipe(first()).toPromise();

    expect(panel.getIconType()).toMatchInlineSnapshot(`"document"`);
    expect(panel.getDisplayName()).toMatchInlineSnapshot(`"Download CSV"`);
  });

  describe('Application UI Capabilities', () => {
    it(`doesn't allow downloads when UI capability is not enabled`, async () => {
      mockStartServicesPayload[0].application = { capabilities: {} } as CoreStart['application'];
      const plugin = new ReportingCsvPanelAction({
        core,
        apiClient,
        startServices$: mockStartServices$,
        usesUiCapabilities: true,
      });

      await mockStartServices$.pipe(first()).toPromise();

      expect(await plugin.isCompatible(context)).toEqual(false);
    });

    it(`allows downloads when license is valid and UI capability is enabled`, async () => {
      const plugin = new ReportingCsvPanelAction({
        core,
        apiClient,
        startServices$: mockStartServices$,
        usesUiCapabilities: true,
      });

      await mockStartServices$.pipe(first()).toPromise();

      expect(await plugin.isCompatible(context)).toEqual(true);
    });

    it(`allows download when license is valid and deprecated roles config is enabled`, async () => {
      const plugin = new ReportingCsvPanelAction({
        core,
        apiClient,
        startServices$: mockStartServices$,
        usesUiCapabilities: false,
      });

      expect(await plugin.isCompatible(context)).toEqual(true);
    });
  });
});
