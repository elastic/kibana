/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { first } from 'rxjs/operators';
import { CoreStart } from 'src/core/public';
import { coreMock } from '../../../../../src/core/public/mocks';
import { LicensingPluginSetup } from '../../../licensing/public';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { ReportingCsvPanelAction } from './get_csv_panel_action';

type LicenseResults = 'valid' | 'invalid' | 'unavailable' | 'expired';

const core = coreMock.createSetup();
let apiClient: ReportingAPIClient;

describe('GetCsvReportPanelAction', () => {
  let context: any;
  let mockLicense$: any;
  let mockSearchSource: any;
  let mockStartServicesPayload: [CoreStart, object, unknown];
  let mockStartServices$: Rx.Subject<typeof mockStartServicesPayload>;

  beforeAll(() => {
    if (typeof window.URL.revokeObjectURL === 'undefined') {
      Object.defineProperty(window.URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: () => {},
      });
    }
  });

  beforeEach(() => {
    apiClient = new ReportingAPIClient(core.http, core.uiSettings, '7.15.0');
    jest.spyOn(apiClient, 'createImmediateReport');

    mockLicense$ = (state: LicenseResults = 'valid') => {
      return (Rx.of({
        check: jest.fn().mockImplementation(() => ({ state })),
      }) as unknown) as LicensingPluginSetup['license$'];
    };

    mockStartServices$ = new Rx.Subject<[CoreStart, object, unknown]>();
    mockStartServicesPayload = [
      ({
        application: { capabilities: { dashboard: { downloadCsv: true } } },
      } as unknown) as CoreStart,
      {},
      null,
    ];

    mockSearchSource = {
      createCopy: () => mockSearchSource,
      removeField: jest.fn(),
      setField: jest.fn(),
      getField: jest.fn(),
      getSerializedFields: jest.fn().mockImplementation(() => ({})),
    };

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
    } as any;
  });

  it('translates empty embeddable context into job params', async () => {
    const panel = new ReportingCsvPanelAction({
      core,
      apiClient,
      license$: mockLicense$(),
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
    });

    mockStartServices$.next(mockStartServicesPayload);

    await panel.execute(context);

    expect(apiClient.createImmediateReport).toHaveBeenCalledWith({
      browserTimezone: undefined,
      columns: [],
      objectType: 'downloadCsv',
      searchSource: {},
      title: undefined,
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
    };
    context.embeddable.getSavedSearch = () => {
      return {
        searchSource: mockSearchSource,
        columns: ['column_a', 'column_b'],
      };
    };

    const panel = new ReportingCsvPanelAction({
      core,
      apiClient,
      license$: mockLicense$(),
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
    });

    mockStartServices$.next(mockStartServicesPayload);

    await panel.execute(context);

    expect(apiClient.createImmediateReport).toHaveBeenCalledWith({
      browserTimezone: undefined,
      columns: ['column_a', 'column_b'],
      objectType: 'downloadCsv',
      searchSource: { testData: 'testDataValue' },
      title: undefined,
      version: '7.15.0',
    });
  });

  it('allows downloading for valid licenses', async () => {
    const panel = new ReportingCsvPanelAction({
      core,
      apiClient,
      license$: mockLicense$(),
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
    });

    mockStartServices$.next(mockStartServicesPayload);

    await panel.execute(context);

    expect(core.http.post).toHaveBeenCalled();
  });

  it('shows a good old toastie when it successfully starts', async () => {
    const panel = new ReportingCsvPanelAction({
      core,
      apiClient,
      license$: mockLicense$(),
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
    });

    mockStartServices$.next(mockStartServicesPayload);

    await panel.execute(context);

    expect(core.notifications.toasts.addSuccess).toHaveBeenCalled();
    expect(core.notifications.toasts.addDanger).not.toHaveBeenCalled();
  });

  it('shows a bad old toastie when it successfully fails', async () => {
    apiClient.createImmediateReport = jest.fn().mockRejectedValue('No more ram!');
    const panel = new ReportingCsvPanelAction({
      core,
      apiClient,
      license$: mockLicense$(),
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
    });

    mockStartServices$.next(mockStartServicesPayload);

    await panel.execute(context);

    expect(core.notifications.toasts.addDanger).toHaveBeenCalled();
  });

  it(`doesn't allow downloads with bad licenses`, async () => {
    const licenseMock$ = mockLicense$('invalid');
    const plugin = new ReportingCsvPanelAction({
      core,
      apiClient,
      license$: licenseMock$,
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
    });

    mockStartServices$.next(mockStartServicesPayload);

    await licenseMock$.pipe(first()).toPromise();

    expect(await plugin.isCompatible(context)).toEqual(false);
  });

  it('sets a display and icon type', () => {
    const panel = new ReportingCsvPanelAction({
      core,
      apiClient,
      license$: mockLicense$(),
      startServices$: mockStartServices$,
      usesUiCapabilities: true,
    });

    mockStartServices$.next(mockStartServicesPayload);

    expect(panel.getIconType()).toMatchInlineSnapshot(`"document"`);
    expect(panel.getDisplayName()).toMatchInlineSnapshot(`"Download CSV"`);
  });

  describe('Application UI Capabilities', () => {
    it(`doesn't allow downloads when UI capability is not enabled`, async () => {
      const plugin = new ReportingCsvPanelAction({
        core,
        apiClient,
        license$: mockLicense$(),
        startServices$: mockStartServices$,
        usesUiCapabilities: true,
      });

      mockStartServices$.next([
        ({ application: { capabilities: {} } } as unknown) as CoreStart,
        {},
        null,
      ]);

      expect(await plugin.isCompatible(context)).toEqual(false);
    });

    it(`allows downloads when license is valid and UI capability is enabled`, async () => {
      mockStartServices$ = new Rx.Subject();
      const plugin = new ReportingCsvPanelAction({
        core,
        apiClient,
        license$: mockLicense$(),
        startServices$: mockStartServices$,
        usesUiCapabilities: true,
      });

      mockStartServices$.next(mockStartServicesPayload);

      expect(await plugin.isCompatible(context)).toEqual(true);
    });

    it(`allows download when license is valid and deprecated roles config is enabled`, async () => {
      const plugin = new ReportingCsvPanelAction({
        core,
        apiClient,
        license$: mockLicense$(),
        startServices$: mockStartServices$,
        usesUiCapabilities: false,
      });

      expect(await plugin.isCompatible(context)).toEqual(true);
    });
  });
});
