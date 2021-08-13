/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed } from '@kbn/test/jest';
import { UnwrapPromise } from '@kbn/utility-types';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { Observable } from 'rxjs';
import type { NotificationsSetup } from '../../../../../src/core/public';
import {
  applicationServiceMock,
  httpServiceMock,
  notificationServiceMock,
} from '../../../../../src/core/public/mocks';
import type { LocatorPublic, SharePluginSetup } from '../../../../../src/plugins/share/public';
import type { ILicense } from '../../../licensing/public';
import { IlmPolicyMigrationStatus, ReportApiJSON } from '../../common/types';
import { IlmPolicyStatusContextProvider } from '../lib/ilm_policy_status_context';
import { Job } from '../lib/job';
import { InternalApiClientProvider, ReportingAPIClient } from '../lib/reporting_api_client';
import { KibanaContextProvider } from '../shared_imports';
import { ListingProps as Props, ReportListing } from '.';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => {
  return {
    htmlIdGenerator: () => () => `generated-id`,
  };
});

const mockJobs: ReportApiJSON[] = [
  { id: 'k90e51pk1ieucbae0c3t8wo2', index: '.reporting-2020.04.12', migration_version: '7.15.0', attempts: 0, browser_type: 'chromium', created_at: '2020-04-14T21:01:13.064Z', created_by: 'elastic', jobtype: 'printable_pdf', max_attempts: 1, meta: { layout: 'preserve_layout', objectType: 'canvas workpad' }, payload: { browserTimezone: 'America/Phoenix', layout: { dimensions: { height: 720, width: 1080 }, id: 'preserve_layout' }, objectType: 'canvas workpad', title: 'My Canvas Workpad', version: '7.14.0'  }, process_expiration: '1970-01-01T00:00:00.000Z', status: 'pending', timeout: 300000}, // prettier-ignore
  { id: 'k90e51pk1ieucbae0c3t8wo1', index: '.reporting-2020.04.12', migration_version: '7.15.0', attempts: 1, browser_type: 'chromium', created_at: '2020-04-14T21:01:13.064Z', created_by: 'elastic', jobtype: 'printable_pdf', kibana_id: '5b2de169-2785-441b-ae8c-186a1936b17d', kibana_name: 'spicy.local', max_attempts: 1, meta: { layout: 'preserve_layout', objectType: 'canvas workpad' }, payload: { browserTimezone: 'America/Phoenix', layout: { dimensions: { height: 720, width: 1080 }, id: 'preserve_layout' }, objectType: 'canvas workpad', title: 'My Canvas Workpad', version: '7.14.0' }, process_expiration: '2020-04-14T21:06:14.526Z', started_at: '2020-04-14T21:01:14.526Z', status: 'processing', timeout: 300000 },
  { id: 'k90cmthd1gv8cbae0c2le8bo', index: '.reporting-2020.04.12', migration_version: '7.15.0', attempts: 1, browser_type: 'chromium', completed_at: '2020-04-14T20:19:14.748Z', created_at: '2020-04-14T20:19:02.977Z', created_by: 'elastic', jobtype: 'printable_pdf', kibana_id: '5b2de169-2785-441b-ae8c-186a1936b17d', kibana_name: 'spicy.local', max_attempts: 1, meta: { layout: 'preserve_layout', objectType: 'canvas workpad' }, output: { content_type: 'application/pdf', size: 80262 }, payload: { browserTimezone: 'America/Phoenix', layout: { dimensions: { height: 720, width: 1080 }, id: 'preserve_layout' }, objectType: 'canvas workpad', title: 'My Canvas Workpad', version: '7.14.0' }, process_expiration: '2020-04-14T20:24:04.073Z', started_at: '2020-04-14T20:19:04.073Z', status: 'completed', timeout: 300000 },
  { id: 'k906958e1d4wcbae0c9hip1a', index: '.reporting-2020.04.12', migration_version: '7.15.0', attempts: 1, browser_type: 'chromium', completed_at: '2020-04-14T17:21:08.223Z', created_at: '2020-04-14T17:20:27.326Z', created_by: 'elastic', jobtype: 'printable_pdf', kibana_id: '5b2de169-2785-441b-ae8c-186a1936b17d', kibana_name: 'spicy.local', max_attempts: 1, meta: { layout: 'preserve_layout', objectType: 'canvas workpad' }, output: { content_type: 'application/pdf', size: 49468, warnings: [ 'An error occurred when trying to read the page for visualization panel info. You may need to increase \'xpack.reporting.capture.timeouts.waitForElements\'. TimeoutError: waiting for selector "[data-shared-item],[data-shared-items-count]" failed: timeout 30000ms exceeded' ] }, payload: { browserTimezone: 'America/Phoenix', layout: { dimensions: { height: 720, width: 1080 }, id: 'preserve_layout' }, objectType: 'canvas workpad', title: 'My Canvas Workpad', version: '7.14.0' }, process_expiration: '2020-04-14T17:25:29.444Z', started_at: '2020-04-14T17:20:29.444Z', status: 'completed_with_warnings', timeout: 300000 },
  { id: 'k9067y2a1d4wcbae0cad38n0', index: '.reporting-2020.04.12', migration_version: '7.15.0', attempts: 1, browser_type: 'chromium', completed_at: '2020-04-14T17:19:53.244Z', created_at: '2020-04-14T17:19:31.379Z', created_by: 'elastic', jobtype: 'printable_pdf', kibana_id: '5b2de169-2785-441b-ae8c-186a1936b17d', kibana_name: 'spicy.local', max_attempts: 1, meta: { layout: 'preserve_layout', objectType: 'canvas workpad' }, output: { content_type: 'application/pdf', size: 80262 }, payload: { browserTimezone: 'America/Phoenix', layout: { dimensions: { height: 720, width: 1080 }, id: 'preserve_layout' }, objectType: 'canvas workpad', title: 'My Canvas Workpad', version: '7.14.0' }, process_expiration: '2020-04-14T17:24:39.883Z', started_at: '2020-04-14T17:19:39.883Z', status: 'completed', timeout: 300000 },
  { id: 'k9067s1m1d4wcbae0cdnvcms', index: '.reporting-2020.04.12', migration_version: '7.15.0', attempts: 1, browser_type: 'chromium', completed_at: '2020-04-14T17:19:36.822Z', created_at: '2020-04-14T17:19:23.578Z', created_by: 'elastic', jobtype: 'printable_pdf', kibana_id: '5b2de169-2785-441b-ae8c-186a1936b17d', kibana_name: 'spicy.local', max_attempts: 1, meta: { layout: 'preserve_layout', objectType: 'canvas workpad' }, output: { content_type: 'application/pdf', size: 80262 }, payload: { browserTimezone: 'America/Phoenix', layout: { dimensions: { height: 720, width: 1080 }, id: 'preserve_layout' }, objectType: 'canvas workpad', title: 'My Canvas Workpad', version: '7.14.0' }, process_expiration: '2020-04-14T17:24:25.247Z', started_at: '2020-04-14T17:19:25.247Z', status: 'completed', timeout: 300000 },
  { id: 'k9065q3s1d4wcbae0c00fxlh', index: '.reporting-2020.04.12', migration_version: '7.15.0', attempts: 1, browser_type: 'chromium', completed_at: '2020-04-14T17:18:03.910Z', created_at: '2020-04-14T17:17:47.752Z', created_by: 'elastic', jobtype: 'printable_pdf', kibana_id: '5b2de169-2785-441b-ae8c-186a1936b17d', kibana_name: 'spicy.local', max_attempts: 1, meta: { layout: 'preserve_layout', objectType: 'canvas workpad' }, output: { content_type: 'application/pdf', size: 80262 }, payload: { browserTimezone: 'America/Phoenix', layout: { dimensions: { height: 720, width: 1080 }, id: 'preserve_layout' }, objectType: 'canvas workpad', title: 'My Canvas Workpad', version: '7.14.0' }, process_expiration: '2020-04-14T17:22:50.379Z', started_at: '2020-04-14T17:17:50.379Z', status: 'completed', timeout: 300000 },
  { id: 'k905zdw11d34cbae0c3y6tzh', index: '.reporting-2020.04.12', migration_version: '7.15.0', attempts: 1, browser_type: 'chromium', completed_at: '2020-04-14T17:13:03.719Z', created_at: '2020-04-14T17:12:51.985Z', created_by: 'elastic', jobtype: 'printable_pdf', kibana_id: '5b2de169-2785-441b-ae8c-186a1936b17d', kibana_name: 'spicy.local', max_attempts: 1, meta: { layout: 'preserve_layout', objectType: 'canvas workpad' }, output: { content_type: 'application/pdf', size: 80262 }, payload: { browserTimezone: 'America/Phoenix', layout: { dimensions: { height: 720, width: 1080 }, id: 'preserve_layout' }, objectType: 'canvas workpad', title: 'My Canvas Workpad', version: '7.14.0' }, process_expiration: '2020-04-14T17:17:52.431Z', started_at: '2020-04-14T17:12:52.431Z', status: 'completed', timeout: 300000 },
  { id: 'k8t4ylcb07mi9d006214ifyg', index: '.reporting-2020.04.05', migration_version: '7.15.0', attempts: 1, browser_type: 'chromium', completed_at: '2020-04-09T19:10:10.049Z', created_at: '2020-04-09T19:09:52.139Z', created_by: 'elastic', jobtype: 'PNG', kibana_id: 'f2e59b4e-f79b-4a48-8a7d-6d50a3c1d914', kibana_name: 'spicy.local', max_attempts: 1, meta: { layout: 'png', objectType: 'visualization' }, output: { content_type: 'image/png', size: 123456789 }, payload: { browserTimezone: 'America/Phoenix', layout: { dimensions: { height: 1575, width: 1423 }, id: 'png' }, objectType: 'visualization', title: 'count', version: '7.14.0' }, process_expiration: '2020-04-09T19:14:54.570Z', started_at: '2020-04-09T19:09:54.570Z', status: 'completed', timeout: 300000 },
]; // prettier-ignore

const reportingAPIClient = {
  list: () => Promise.resolve(mockJobs.map((j) => new Job(j))),
  total: () => Promise.resolve(18),
  migrateReportingIndicesIlmPolicy: jest.fn(),
} as any;

const validCheck = {
  check: () => ({
    state: 'VALID',
    message: '',
  }),
};

const license$ = {
  subscribe: (handler: any) => {
    return handler(validCheck);
  },
} as Observable<ILicense>;

const mockPollConfig = {
  jobCompletionNotifier: {
    interval: 5000,
    intervalErrorMultiplier: 3,
  },
  jobsRefresh: {
    interval: 5000,
    intervalErrorMultiplier: 3,
  },
};

describe('ReportListing', () => {
  let httpService: ReturnType<typeof httpServiceMock.createSetupContract>;
  let applicationService: ReturnType<typeof applicationServiceMock.createStartContract>;
  let ilmLocator: undefined | LocatorPublic<any>;
  let urlService: SharePluginSetup['url'];
  let testBed: UnwrapPromise<ReturnType<typeof setup>>;
  let toasts: NotificationsSetup['toasts'];

  const createTestBed = registerTestBed(
    (props?: Partial<Props>) => (
      <KibanaContextProvider services={{ http: httpService, application: applicationService }}>
        <InternalApiClientProvider apiClient={reportingAPIClient as ReportingAPIClient}>
          <IlmPolicyStatusContextProvider>
            <ReportListing
              license$={license$}
              pollConfig={mockPollConfig}
              redirect={jest.fn()}
              navigateToUrl={jest.fn()}
              urlService={urlService}
              toasts={toasts}
              {...props}
            />
          </IlmPolicyStatusContextProvider>
        </InternalApiClientProvider>
      </KibanaContextProvider>
    ),
    { memoryRouter: { wrapComponent: false } }
  );

  const setup = async (props?: Partial<Props>) => {
    const tb = await createTestBed(props);
    const { find, exists, component } = tb;

    return {
      ...tb,
      actions: {
        findListTable: () => find('reportJobListing'),
        hasIlmMigrationBanner: () => exists('migrateReportingIndicesPolicyCallOut'),
        hasIlmPolicyLink: () => exists('ilmPolicyLink'),
        migrateIndices: async () => {
          await act(async () => {
            find('migrateReportingIndicesButton').simulate('click');
          });
          component.update();
        },
      },
    };
  };

  const runSetup = async (props?: Partial<Props>) => {
    await act(async () => {
      testBed = await setup(props);
    });
    testBed.component.update();
  };

  beforeEach(async () => {
    toasts = notificationServiceMock.createSetupContract().toasts;
    httpService = httpServiceMock.createSetupContract();
    applicationService = applicationServiceMock.createStartContract();
    applicationService.capabilities = {
      catalogue: {},
      navLinks: {},
      management: { data: { index_lifecycle_management: true } },
    };
    ilmLocator = ({
      getUrl: jest.fn(),
    } as unknown) as LocatorPublic<any>;

    urlService = ({
      locators: {
        get: () => ilmLocator,
      },
    } as unknown) as SharePluginSetup['url'];
    await runSetup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Report job listing with some items', () => {
    const { actions } = testBed;
    const table = actions.findListTable();
    expect(table).toMatchSnapshot();
  });

  it('subscribes to license changes, and unsubscribes on dismount', async () => {
    const unsubscribeMock = jest.fn();
    const subMock = {
      subscribe: jest.fn().mockReturnValue({
        unsubscribe: unsubscribeMock,
      }),
    } as any;

    await runSetup({ license$: subMock });

    expect(subMock.subscribe).toHaveBeenCalled();
    expect(unsubscribeMock).not.toHaveBeenCalled();
    testBed.component.unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  describe('ILM policy', () => {
    beforeEach(async () => {
      httpService = httpServiceMock.createSetupContract();
      ilmLocator = ({
        getUrl: jest.fn(),
      } as unknown) as LocatorPublic<any>;

      urlService = ({
        locators: {
          get: () => ilmLocator,
        },
      } as unknown) as SharePluginSetup['url'];

      await runSetup();
    });

    it('shows the migrate banner when migration status is not "OK"', async () => {
      const status: IlmPolicyMigrationStatus = 'indices-not-managed-by-policy';
      httpService.get.mockResolvedValue({ status });
      await runSetup();
      const { actions } = testBed;
      expect(actions.hasIlmMigrationBanner()).toBe(true);
    });

    it('does not show the migrate banner when migration status is "OK"', async () => {
      const status: IlmPolicyMigrationStatus = 'ok';
      httpService.get.mockResolvedValue({ status });
      await runSetup();
      const { actions } = testBed;
      expect(actions.hasIlmMigrationBanner()).toBe(false);
    });

    it('hides the ILM policy link if there is no ILM policy', async () => {
      const status: IlmPolicyMigrationStatus = 'policy-not-found';
      httpService.get.mockResolvedValue({ status });
      await runSetup();
      const { actions } = testBed;
      expect(actions.hasIlmPolicyLink()).toBe(false);
    });

    it('hides the ILM policy link if there is no ILM policy locator', async () => {
      ilmLocator = undefined;
      const status: IlmPolicyMigrationStatus = 'ok'; // should never happen, but need to test that when the locator is missing we don't render the link
      httpService.get.mockResolvedValue({ status });
      await runSetup();
      const { actions } = testBed;
      expect(actions.hasIlmPolicyLink()).toBe(false);
    });

    it('always shows the ILM policy link if there is an ILM policy', async () => {
      const status: IlmPolicyMigrationStatus = 'ok';
      httpService.get.mockResolvedValue({ status });
      await runSetup();
      const { actions } = testBed;
      expect(actions.hasIlmPolicyLink()).toBe(true);

      const status2: IlmPolicyMigrationStatus = 'indices-not-managed-by-policy';
      httpService.get.mockResolvedValue({ status: status2 });
      await runSetup();
      expect(actions.hasIlmPolicyLink()).toBe(true);
    });

    it('hides the banner after migrating indices', async () => {
      const status: IlmPolicyMigrationStatus = 'indices-not-managed-by-policy';
      const status2: IlmPolicyMigrationStatus = 'ok';
      httpService.get.mockResolvedValueOnce({ status });
      httpService.get.mockResolvedValueOnce({ status: status2 });
      await runSetup();
      const { actions } = testBed;

      expect(actions.hasIlmMigrationBanner()).toBe(true);
      await actions.migrateIndices();
      expect(actions.hasIlmMigrationBanner()).toBe(false);
      expect(actions.hasIlmPolicyLink()).toBe(true);
      expect(toasts.addSuccess).toHaveBeenCalledTimes(1);
    });

    it('informs users when migrations failed', async () => {
      const status: IlmPolicyMigrationStatus = 'indices-not-managed-by-policy';
      httpService.get.mockResolvedValueOnce({ status });
      reportingAPIClient.migrateReportingIndicesIlmPolicy.mockRejectedValueOnce(new Error('oops!'));
      await runSetup();
      const { actions } = testBed;

      expect(actions.hasIlmMigrationBanner()).toBe(true);
      await actions.migrateIndices();
      expect(toasts.addError).toHaveBeenCalledTimes(1);
      expect(actions.hasIlmMigrationBanner()).toBe(true);
      expect(actions.hasIlmPolicyLink()).toBe(true);
    });

    it('only shows the link to the ILM policy if UI capabilities allow it', async () => {
      applicationService.capabilities = {
        catalogue: {},
        navLinks: {},
        management: { data: { index_lifecycle_management: false } },
      };
      await runSetup();

      expect(testBed.actions.hasIlmPolicyLink()).toBe(false);

      applicationService.capabilities = {
        catalogue: {},
        navLinks: {},
        management: { data: { index_lifecycle_management: true } },
      };

      await runSetup();

      expect(testBed.actions.hasIlmPolicyLink()).toBe(true);
    });
  });
});
