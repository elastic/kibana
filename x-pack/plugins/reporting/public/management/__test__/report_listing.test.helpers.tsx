/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { registerTestBed } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { Observable } from 'rxjs';
import { SerializableRecord } from '@kbn/utility-types';

import type { NotificationsSetup } from '@kbn/core/public';
import {
  applicationServiceMock,
  httpServiceMock,
  notificationServiceMock,
  coreMock,
} from '@kbn/core/public/mocks';
import type { LocatorPublic, SharePluginSetup } from '@kbn/share-plugin/public';

import type { ILicense } from '@kbn/licensing-plugin/public';

import { mockJobs } from '../../../common/test';

import { KibanaContextProvider } from '../../shared_imports';

import { IlmPolicyStatusContextProvider } from '../../lib/ilm_policy_status_context';
import { InternalApiClientProvider, ReportingAPIClient } from '../../lib/reporting_api_client';
import { Job } from '../../lib/job';

import { ListingProps as Props, ReportListing } from '..';

export interface TestDependencies {
  http: ReturnType<typeof httpServiceMock.createSetupContract>;
  application: ReturnType<typeof applicationServiceMock.createStartContract>;
  reportingAPIClient: ReportingAPIClient;
  license$: Observable<ILicense>;
  urlService: SharePluginSetup['url'];
  toasts: NotificationsSetup['toasts'];
  ilmLocator: LocatorPublic<SerializableRecord>;
  uiSettings: ReturnType<typeof coreMock.createSetup>['uiSettings'];
}

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

const validCheck = {
  check: () => ({
    state: 'VALID',
    message: '',
  }),
};

const license$ = {
  subscribe: (handler: unknown) => {
    return (handler as Function)(validCheck);
  },
} as Observable<ILicense>;

const createTestBed = registerTestBed(
  ({
    http,
    application,
    reportingAPIClient,
    license$: l$,
    urlService,
    toasts,
    uiSettings,
    ...rest
  }: Partial<Props> & TestDependencies) => (
    <KibanaContextProvider services={{ http, application, uiSettings }}>
      <InternalApiClientProvider apiClient={reportingAPIClient}>
        <IlmPolicyStatusContextProvider>
          <ReportListing
            license$={l$}
            pollConfig={mockPollConfig}
            redirect={jest.fn()}
            navigateToUrl={jest.fn()}
            urlService={urlService}
            toasts={toasts}
            {...rest}
          />
        </IlmPolicyStatusContextProvider>
      </InternalApiClientProvider>
    </KibanaContextProvider>
  ),
  { memoryRouter: { wrapComponent: false } }
);

export type TestBed = Awaited<ReturnType<typeof setup>>;

export const setup = async (props?: Partial<Props>) => {
  const uiSettingsClient = coreMock.createSetup().uiSettings;
  const httpService = httpServiceMock.createSetupContract();
  const reportingAPIClient = new ReportingAPIClient(httpService, uiSettingsClient, 'x.x.x');

  jest
    .spyOn(reportingAPIClient, 'list')
    .mockImplementation(() => Promise.resolve(mockJobs.map((j) => new Job(j))));
  jest.spyOn(reportingAPIClient, 'total').mockImplementation(() => Promise.resolve(18));
  jest.spyOn(reportingAPIClient, 'migrateReportingIndicesIlmPolicy').mockImplementation(jest.fn());

  const ilmLocator: LocatorPublic<SerializableRecord> = {
    getUrl: jest.fn(),
  } as unknown as LocatorPublic<SerializableRecord>;

  const testDependencies: TestDependencies = {
    http: httpService,
    application: applicationServiceMock.createStartContract(),
    toasts: notificationServiceMock.createSetupContract().toasts,
    license$,
    reportingAPIClient,
    ilmLocator,
    uiSettings: uiSettingsClient,
    urlService: {
      locators: {
        get: () => ilmLocator,
      },
    } as unknown as SharePluginSetup['url'],
  };

  const testBed = createTestBed({ ...testDependencies, ...props });

  const { find, exists, component } = testBed;

  const api = {
    ...testBed,
    testDependencies,
    actions: {
      findListTable: () => find('reportJobListing'),
      hasIlmMigrationBanner: () => exists('migrateReportingIndicesPolicyCallOut'),
      hasIlmPolicyLink: () => exists('ilmPolicyLink'),
      flyout: {
        open: async (jobId: string) => {
          await act(async () => {
            find(`viewReportingLink${jobId}`).simulate('click');
          });
          component.update();
        },
        openActionsMenu: () => {
          act(() => {
            find('reportInfoFlyoutActionsButton').simulate('click');
          });
          component.update();
        },
        findDownloadButton: () => find('reportInfoFlyoutDownloadButton'),
        findOpenInAppButton: () => find('reportInfoFlyoutOpenInKibanaButton'),
      },
      migrateIndices: async () => {
        await act(async () => {
          find('migrateReportingIndicesButton').simulate('click');
        });
        component.update();
      },
    },
  };

  return api;
};
