/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { act } from 'react-dom/test-utils';

import type { ILicense } from '../../../licensing/public';
import type { IlmPolicyMigrationStatus } from '../../common/types';

import { ListingProps as Props } from '.';

import { setup, TestBed, TestDependencies, mockJobs } from './__test__';
import { Job } from '../lib/job';

describe('ReportListing', () => {
  let testBed: TestBed;
  let applicationService: TestDependencies['application'];

  const runSetup = async (props?: Partial<Props>) => {
    await act(async () => {
      testBed = await setup(props);
    });
    testBed.component.update();
  };

  beforeEach(async () => {
    await runSetup();
    // Collect all of the injected services so we can mutate for the tests
    applicationService = testBed.testDependencies.application;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a listing with some items', () => {
    const { find } = testBed;
    expect(find('reportDownloadLink').length).toBe(mockJobs.length);
  });

  it('subscribes to license changes, and unsubscribes on dismount', async () => {
    const unsubscribeMock = jest.fn();
    const subMock = {
      subscribe: jest.fn().mockReturnValue({
        unsubscribe: unsubscribeMock,
      }),
    } as unknown as Observable<ILicense>;

    await runSetup({ license$: subMock });

    expect(subMock.subscribe).toHaveBeenCalled();
    expect(unsubscribeMock).not.toHaveBeenCalled();
    testBed.component.unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('navigates to a Kibana App in a new tab and is spaces aware', () => {
    const { find } = testBed;

    jest.spyOn(window, 'open').mockImplementation(jest.fn());
    jest.spyOn(window, 'focus').mockImplementation(jest.fn());

    find('euiCollapsedItemActionsButton').first().simulate('click');
    find('reportOpenInKibanaApp').first().simulate('click');

    expect(window.open).toHaveBeenCalledWith(
      '/s/my-space/app/reportingRedirect?jobId=k90e51pk1ieucbae0c3t8wo2',
      '_blank'
    );
  });

  describe('flyout', () => {
    let reportingAPIClient: TestDependencies['reportingAPIClient'];
    let jobUnderTest: Job;

    beforeEach(async () => {
      await runSetup();
      reportingAPIClient = testBed.testDependencies.reportingAPIClient;
      jest.spyOn(reportingAPIClient, 'getInfo').mockResolvedValue(jobUnderTest);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('shows the enabled "open in Kibana" button in the actions menu for v2 jobs', async () => {
      const [jobJson] = mockJobs;
      jobUnderTest = new Job(jobJson);
      const { actions } = testBed;

      await actions.flyout.open(jobUnderTest.id);
      actions.flyout.openActionsMenu();
      expect(actions.flyout.findOpenInAppButton().props().disabled).toBe(false);
    });

    it('shows the disabled "open in Kibana" button in the actions menu for pre-v2 jobs', async () => {
      const [, jobJson] = mockJobs;
      jobUnderTest = new Job(jobJson);
      const { actions } = testBed;

      await actions.flyout.open(jobUnderTest.id);
      actions.flyout.openActionsMenu();
      expect(actions.flyout.findOpenInAppButton().props().disabled).toBe(true);
    });

    it('shows the disabled "Download" button in the actions menu for a job that is not done', async () => {
      const [jobJson] = mockJobs;
      jobUnderTest = new Job(jobJson);
      const { actions } = testBed;

      await actions.flyout.open(jobUnderTest.id);
      actions.flyout.openActionsMenu();
      expect(actions.flyout.findDownloadButton().props().disabled).toBe(true);
    });

    it('shows the enabled "Download" button in the actions menu for a job is done', async () => {
      const [, , jobJson] = mockJobs;
      jobUnderTest = new Job(jobJson);
      const { actions } = testBed;

      await actions.flyout.open(jobUnderTest.id);
      actions.flyout.openActionsMenu();
      expect(actions.flyout.findDownloadButton().props().disabled).toBe(false);
    });
  });

  describe('ILM policy', () => {
    let httpService: TestDependencies['http'];
    let urlService: TestDependencies['urlService'];
    let toasts: TestDependencies['toasts'];
    let reportingAPIClient: TestDependencies['reportingAPIClient'];

    /**
     * Simulate a fresh page load, useful for network requests and other effects
     * that happen only at first load.
     */
    const remountComponent = async () => {
      const { component } = testBed;
      act(() => {
        component.unmount();
      });
      await act(async () => {
        component.mount();
      });
      // Flush promises
      await new Promise((r) => setImmediate(r));
      component.update();
    };

    beforeEach(async () => {
      await runSetup();
      // Collect all of the injected services so we can mutate for the tests
      applicationService = testBed.testDependencies.application;
      applicationService.capabilities = {
        catalogue: {},
        navLinks: {},
        management: { data: { index_lifecycle_management: true } },
      };
      httpService = testBed.testDependencies.http;
      urlService = testBed.testDependencies.urlService;
      toasts = testBed.testDependencies.toasts;
      reportingAPIClient = testBed.testDependencies.reportingAPIClient;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows the migrate banner when migration status is not "OK"', async () => {
      const { actions } = testBed;
      const status: IlmPolicyMigrationStatus = 'indices-not-managed-by-policy';
      httpService.get.mockResolvedValue({ status });
      await remountComponent();
      expect(actions.hasIlmMigrationBanner()).toBe(true);
    });

    it('does not show the migrate banner when migration status is "OK"', async () => {
      const { actions } = testBed;
      const status: IlmPolicyMigrationStatus = 'ok';
      httpService.get.mockResolvedValue({ status });
      await remountComponent();
      expect(actions.hasIlmMigrationBanner()).toBe(false);
    });

    it('hides the ILM policy link if there is no ILM policy', async () => {
      const { actions } = testBed;
      const status: IlmPolicyMigrationStatus = 'policy-not-found';
      httpService.get.mockResolvedValue({ status });
      await remountComponent();
      expect(actions.hasIlmPolicyLink()).toBe(false);
    });

    it('hides the ILM policy link if there is no ILM policy locator', async () => {
      const { actions } = testBed;
      jest.spyOn(urlService.locators, 'get').mockReturnValue(undefined);
      const status: IlmPolicyMigrationStatus = 'ok'; // should never happen, but need to test that when the locator is missing we don't render the link
      httpService.get.mockResolvedValue({ status });
      await remountComponent();
      expect(actions.hasIlmPolicyLink()).toBe(false);
    });

    it('always shows the ILM policy link if there is an ILM policy', async () => {
      const { actions } = testBed;
      const status: IlmPolicyMigrationStatus = 'ok';
      httpService.get.mockResolvedValue({ status });
      await remountComponent();
      expect(actions.hasIlmPolicyLink()).toBe(true);

      const status2: IlmPolicyMigrationStatus = 'indices-not-managed-by-policy';
      httpService.get.mockResolvedValue({ status: status2 });
      await remountComponent();
      expect(actions.hasIlmPolicyLink()).toBe(true);
    });

    it('hides the banner after migrating indices', async () => {
      const { actions } = testBed;
      const status: IlmPolicyMigrationStatus = 'indices-not-managed-by-policy';
      const status2: IlmPolicyMigrationStatus = 'ok';
      httpService.get.mockResolvedValueOnce({ status });
      httpService.get.mockResolvedValueOnce({ status: status2 });
      await remountComponent();

      expect(actions.hasIlmMigrationBanner()).toBe(true);
      await actions.migrateIndices();
      expect(actions.hasIlmMigrationBanner()).toBe(false);
      expect(actions.hasIlmPolicyLink()).toBe(true);
      expect(toasts.addSuccess).toHaveBeenCalledTimes(1);
    });

    it('informs users when migrations failed', async () => {
      const { actions } = testBed;
      const status: IlmPolicyMigrationStatus = 'indices-not-managed-by-policy';
      httpService.get.mockResolvedValueOnce({ status });
      (reportingAPIClient.migrateReportingIndicesIlmPolicy as jest.Mock).mockRejectedValueOnce(
        new Error('oops!')
      );
      await remountComponent();

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
      await remountComponent();

      expect(testBed.actions.hasIlmPolicyLink()).toBe(false);

      applicationService.capabilities = {
        catalogue: {},
        navLinks: {},
        management: { data: { index_lifecycle_management: true } },
      };

      await remountComponent();

      expect(testBed.actions.hasIlmPolicyLink()).toBe(true);
    });
  });
});
