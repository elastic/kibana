/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { first } from 'rxjs/operators';
import { LicensingPluginSetup } from '../../../licensing/public';
import { GetCsvReportPanelAction } from './get_csv_panel_action';

type licenseResults = 'valid' | 'invalid' | 'unavailable' | 'expired';

describe('GetCsvReportPanelAction', () => {
  let core: any;
  let context: any;
  let mockLicense$: any;

  beforeAll(() => {
    if (typeof window.URL.revokeObjectURL === 'undefined') {
      Object.defineProperty(window.URL, 'revokeObjectURL', { value: () => {} });
    }
  });

  beforeEach(() => {
    mockLicense$ = (state: licenseResults = 'valid') => {
      return (of({
        check: jest.fn().mockImplementation(() => ({ state })),
      }) as unknown) as LicensingPluginSetup['license$'];
    };

    core = {
      http: {
        post: jest.fn().mockImplementation(() => Promise.resolve(true)),
      },
      notifications: {
        toasts: {
          addSuccess: jest.fn(),
          addDanger: jest.fn(),
        },
      },
      uiSettings: {
        get: () => 'Browser',
      },
    } as any;

    context = {
      embeddable: {
        type: 'search',
        getSavedSearch: () => ({ id: 'lebowski' }),
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

  it('allows downloading for valid licenses', async () => {
    const panel = new GetCsvReportPanelAction(core, mockLicense$());

    await panel.execute(context);

    expect(core.http.post).toHaveBeenCalled();
  });

  it('shows a good old toastie when it successfully starts', async () => {
    const panel = new GetCsvReportPanelAction(core, mockLicense$());

    await panel.execute(context);

    expect(core.notifications.toasts.addSuccess).toHaveBeenCalled();
    expect(core.notifications.toasts.addDanger).not.toHaveBeenCalled();
  });

  it('shows a bad old toastie when it successfully fails', async () => {
    const coreFails = {
      ...core,
      http: {
        post: jest.fn().mockImplementation(() => Promise.reject('No more ram!')),
      },
    };
    const panel = new GetCsvReportPanelAction(coreFails, mockLicense$());

    await panel.execute(context);

    expect(core.notifications.toasts.addDanger).toHaveBeenCalled();
  });

  it(`doesn't allow downloads with bad licenses`, async () => {
    const licenseMock = mockLicense$('invalid');
    const plugin = new GetCsvReportPanelAction(core, licenseMock);
    await licenseMock.pipe(first()).toPromise();
    expect(await plugin.isCompatible(context)).toEqual(false);
  });

  it('sets a display and icon type', () => {
    const panel = new GetCsvReportPanelAction(core, mockLicense$());
    expect(panel.getIconType()).toMatchInlineSnapshot(`"document"`);
    expect(panel.getDisplayName()).toMatchInlineSnapshot(`"Download CSV"`);
  });
});
