/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyMiddleware, createStore } from 'redux';

import { createSpyMiddleware } from '../../../../common/store/test_utils';

import {
  createDefaultPagination,
  createListLoadedResourceState,
  createLoadedListViewWithPagination,
  createSampleTrustedApp,
  createSampleTrustedApps,
  createServerApiError,
  createUninitialisedResourceState,
  createUserChangedUrlAction,
} from '../test_utils';

import { TrustedAppsService } from '../service';
import { Pagination, TrustedAppsListPageLocation, TrustedAppsListPageState } from '../state';
import { initialTrustedAppsPageState } from './builders';
import { trustedAppsPageReducer } from './reducer';
import { createTrustedAppsPageMiddleware } from './middleware';
import { Immutable, ProtectionModes } from '../../../../../common/endpoint/types';
import { GetPolicyListResponse } from '../../policy/types';

const initialNow = 111111;
const dateNowMock = jest.fn();
dateNowMock.mockReturnValue(initialNow);

Date.now = dateNowMock;

const initialState: Immutable<TrustedAppsListPageState> = initialTrustedAppsPageState();

const createGetTrustedListAppsResponse = (pagination: Partial<Pagination>) => {
  const fullPagination = { ...createDefaultPagination(), ...pagination };

  return {
    data: createSampleTrustedApps(pagination),
    page: fullPagination.pageIndex,
    per_page: fullPagination.pageSize,
    total: fullPagination.totalItemCount,
  };
};

const createPolicyResponse = (): GetPolicyListResponse => {
  return {
    items: [
      {
        id: '6c8b0e2f-033e-40d5-8903-7cf3cb16966d',
        version: 'WzEzNDQ0NSw0XQ==',
        name: 'Ransomware protection',
        description: '',
        namespace: 'default',
        policy_id: '9fd2ac50-e86f-11eb-a87f-51e16104076a',
        enabled: true,
        output_id: '',
        inputs: [
          {
            streams: [],
            type: 'endpoint',
            config: {
              artifact_manifest: {
                value: {
                  schema_version: 'v1',
                  manifest_version: '1.0.45',
                  artifacts: {
                    'endpoint-trustlist-windows-v1': {
                      relative_url:
                        '/api/fleet/artifacts/endpoint-trustlist-windows-v1/034079d4153038bc35fed4c5a95e1f19b8d04b5b05bbffabc1662219059e84bd',
                      compression_algorithm: 'zlib',
                      decoded_size: 270,
                      decoded_sha256:
                        '034079d4153038bc35fed4c5a95e1f19b8d04b5b05bbffabc1662219059e84bd',
                      encryption_algorithm: 'none',
                      encoded_sha256:
                        '38f378e57ac9a7153da35c991d1945178d8ae4644dc0109e0f0ca96a6194a52e',
                      encoded_size: 124,
                    },
                    'endpoint-eventfilterlist-windows-v1': {
                      relative_url:
                        '/api/fleet/artifacts/endpoint-eventfilterlist-windows-v1/1a8295e6ccb93022c6f5ceb8997b29f2912389b3b38f52a8f5a2ff7b0154b1bc',
                      compression_algorithm: 'zlib',
                      decoded_size: 287,
                      decoded_sha256:
                        '1a8295e6ccb93022c6f5ceb8997b29f2912389b3b38f52a8f5a2ff7b0154b1bc',
                      encryption_algorithm: 'none',
                      encoded_sha256:
                        'c3dec543df1177561ab2aa74a37997ea3c1d748d532a597884f5a5c16670d56c',
                      encoded_size: 133,
                    },
                    'endpoint-exceptionlist-linux-v1': {
                      relative_url:
                        '/api/fleet/artifacts/endpoint-exceptionlist-linux-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      compression_algorithm: 'zlib',
                      decoded_size: 14,
                      decoded_sha256:
                        'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      encryption_algorithm: 'none',
                      encoded_sha256:
                        'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
                      encoded_size: 22,
                    },
                    'endpoint-trustlist-macos-v1': {
                      relative_url:
                        '/api/fleet/artifacts/endpoint-trustlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      compression_algorithm: 'zlib',
                      decoded_size: 14,
                      decoded_sha256:
                        'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      encryption_algorithm: 'none',
                      encoded_sha256:
                        'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
                      encoded_size: 22,
                    },
                    'endpoint-exceptionlist-macos-v1': {
                      relative_url:
                        '/api/fleet/artifacts/endpoint-exceptionlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      compression_algorithm: 'zlib',
                      decoded_size: 14,
                      decoded_sha256:
                        'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      encryption_algorithm: 'none',
                      encoded_sha256:
                        'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
                      encoded_size: 22,
                    },
                    'endpoint-trustlist-linux-v1': {
                      relative_url:
                        '/api/fleet/artifacts/endpoint-trustlist-linux-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      compression_algorithm: 'zlib',
                      decoded_size: 14,
                      decoded_sha256:
                        'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      encryption_algorithm: 'none',
                      encoded_sha256:
                        'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
                      encoded_size: 22,
                    },
                    'endpoint-eventfilterlist-linux-v1': {
                      relative_url:
                        '/api/fleet/artifacts/endpoint-eventfilterlist-linux-v1/1a8295e6ccb93022c6f5ceb8997b29f2912389b3b38f52a8f5a2ff7b0154b1bc',
                      compression_algorithm: 'zlib',
                      decoded_size: 287,
                      decoded_sha256:
                        '1a8295e6ccb93022c6f5ceb8997b29f2912389b3b38f52a8f5a2ff7b0154b1bc',
                      encryption_algorithm: 'none',
                      encoded_sha256:
                        'c3dec543df1177561ab2aa74a37997ea3c1d748d532a597884f5a5c16670d56c',
                      encoded_size: 133,
                    },
                    'endpoint-exceptionlist-windows-v1': {
                      relative_url:
                        '/api/fleet/artifacts/endpoint-exceptionlist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      compression_algorithm: 'zlib',
                      decoded_size: 14,
                      decoded_sha256:
                        'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      encryption_algorithm: 'none',
                      encoded_sha256:
                        'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
                      encoded_size: 22,
                    },
                    'endpoint-eventfilterlist-macos-v1': {
                      relative_url:
                        '/api/fleet/artifacts/endpoint-eventfilterlist-macos-v1/1a8295e6ccb93022c6f5ceb8997b29f2912389b3b38f52a8f5a2ff7b0154b1bc',
                      compression_algorithm: 'zlib',
                      decoded_size: 287,
                      decoded_sha256:
                        '1a8295e6ccb93022c6f5ceb8997b29f2912389b3b38f52a8f5a2ff7b0154b1bc',
                      encryption_algorithm: 'none',
                      encoded_sha256:
                        'c3dec543df1177561ab2aa74a37997ea3c1d748d532a597884f5a5c16670d56c',
                      encoded_size: 133,
                    },
                  },
                },
              },
              policy: {
                value: {
                  linux: {
                    popup: { malware: { message: '', enabled: true } },
                    malware: { mode: ProtectionModes.prevent },
                    logging: { file: 'info' },
                    events: { process: true, file: true, network: true },
                  },
                  windows: {
                    popup: {
                      malware: { message: '', enabled: true },
                      ransomware: { message: '', enabled: true },
                      memory_protection: { message: '', enabled: true },
                    },
                    malware: { mode: ProtectionModes.prevent },
                    logging: { file: 'info' },
                    antivirus_registration: { enabled: false },
                    events: {
                      registry: true,
                      process: true,
                      security: true,
                      file: true,
                      dns: true,
                      dll_and_driver_load: true,
                      network: true,
                    },
                    ransomware: { mode: ProtectionModes.prevent, supported: true },
                    memory_protection: { mode: ProtectionModes.prevent, supported: true },
                  },
                  mac: {
                    popup: { malware: { message: '', enabled: true } },
                    malware: { mode: ProtectionModes.prevent },
                    logging: { file: 'info' },
                    events: { process: true, file: true, network: true },
                  },
                },
              },
            },
            enabled: true,
          },
        ],
        package: { name: 'endpoint', title: 'Endpoint Security', version: '0.20.2' },
        revision: 3,
        created_at: '2021-07-21T10:34:46.894Z',
        created_by: 'elastic',
        updated_at: '2021-07-21T10:53:25.330Z',
        updated_by: 'system',
      },
    ],
    total: 6,
    page: 1,
    perPage: 1000,
  };
};

const createTrustedAppsServiceMock = (): jest.Mocked<TrustedAppsService> => ({
  getTrustedAppsList: jest.fn(),
  deleteTrustedApp: jest.fn(),
  createTrustedApp: jest.fn(),
  getPolicyList: jest.fn(),
  updateTrustedApp: jest.fn(),
  getTrustedApp: jest.fn(),
});

const createStoreSetup = (trustedAppsService: TrustedAppsService) => {
  const spyMiddleware = createSpyMiddleware<TrustedAppsListPageState>();

  return {
    spyMiddleware,
    store: createStore(
      trustedAppsPageReducer,
      applyMiddleware(
        createTrustedAppsPageMiddleware(trustedAppsService),
        spyMiddleware.actionSpyMiddleware
      )
    ),
  };
};

describe('middleware', () => {
  type TrustedAppsEntriesExistState = Pick<TrustedAppsListPageState, 'entriesExist'>;
  type TrustedAppsPoliciestate = Pick<TrustedAppsListPageState, 'policies'>;
  const entriesExistLoadedState = (): TrustedAppsEntriesExistState => {
    return {
      entriesExist: {
        data: true,
        type: 'LoadedResourceState',
      },
    };
  };
  const policiesLoadedState = (): TrustedAppsPoliciestate => {
    return {
      policies: {
        data: createPolicyResponse(),
        type: 'LoadedResourceState',
      },
    };
  };
  const entriesExistLoadingState = (): TrustedAppsEntriesExistState => {
    return {
      entriesExist: {
        previousState: {
          type: 'UninitialisedResourceState',
        },
        type: 'LoadingResourceState',
      },
    };
  };

  const createLocationState = (
    params?: Partial<TrustedAppsListPageLocation>
  ): TrustedAppsListPageLocation => {
    return {
      ...initialState.location,
      ...(params ?? {}),
    };
  };

  beforeEach(() => {
    dateNowMock.mockReturnValue(initialNow);
  });

  describe('initial state', () => {
    it('sets initial state properly', async () => {
      expect(createStoreSetup(createTrustedAppsServiceMock()).store.getState()).toStrictEqual(
        initialState
      );
    });
  });

  describe('refreshing list resource state', () => {
    it('refreshes the list when location changes and data gets outdated', async () => {
      const pagination = { pageIndex: 2, pageSize: 50 };
      const location = createLocationState({
        page_index: 2,
        page_size: 50,
      });
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockResolvedValue(createGetTrustedListAppsResponse(pagination));

      store.dispatch(
        createUserChangedUrlAction('/administration/trusted_apps', '?page_index=2&page_size=50')
      );

      expect(store.getState()).toStrictEqual({
        ...initialState,
        listView: {
          listResourceState: {
            type: 'LoadingResourceState',
            previousState: createUninitialisedResourceState(),
          },
          freshDataTimestamp: initialNow,
        },
        active: true,
        location,
      });

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      expect(store.getState()).toStrictEqual({
        ...initialState,
        ...entriesExistLoadingState(),
        listView: createLoadedListViewWithPagination(initialNow, pagination),
        active: true,
        location,
      });
    });

    it('does not refresh the list when location changes and data does not get outdated', async () => {
      const pagination = { pageIndex: 2, pageSize: 50 };
      const location = createLocationState({
        page_index: 2,
        page_size: 50,
      });
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockResolvedValue(createGetTrustedListAppsResponse(pagination));

      store.dispatch(
        createUserChangedUrlAction('/administration/trusted_apps', '?page_index=2&page_size=50')
      );

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      store.dispatch(
        createUserChangedUrlAction('/administration/trusted_apps', '?page_index=2&page_size=50')
      );

      expect(service.getTrustedAppsList).toBeCalledTimes(2);
      expect(store.getState()).toStrictEqual({
        ...initialState,
        ...entriesExistLoadingState(),
        listView: createLoadedListViewWithPagination(initialNow, pagination),
        active: true,
        location,
      });
    });

    it('refreshes the list when data gets outdated with and outdate action', async () => {
      const newNow = 222222;
      const pagination = { pageIndex: 0, pageSize: 10 };
      const location = createLocationState();
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockResolvedValue(createGetTrustedListAppsResponse(pagination));
      service.getPolicyList.mockResolvedValue(createPolicyResponse());

      store.dispatch(createUserChangedUrlAction('/administration/trusted_apps'));

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      dateNowMock.mockReturnValue(newNow);

      store.dispatch({ type: 'trustedAppsListDataOutdated' });

      expect(store.getState()).toStrictEqual({
        ...initialState,
        ...entriesExistLoadingState(),
        listView: {
          listResourceState: {
            type: 'LoadingResourceState',
            previousState: createListLoadedResourceState(pagination, initialNow),
          },
          freshDataTimestamp: newNow,
        },
        active: true,
        location,
      });

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');
      await spyMiddleware.waitForAction('trustedAppsPoliciesStateChanged');

      expect(store.getState()).toStrictEqual({
        ...initialState,
        ...entriesExistLoadedState(),
        ...policiesLoadedState(),
        listView: createLoadedListViewWithPagination(newNow, pagination),
        active: true,
        location,
      });
    });

    it('set list resource state to failed when failing to load data', async () => {
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockRejectedValue({
        body: createServerApiError('Internal Server Error'),
      });

      store.dispatch(
        createUserChangedUrlAction('/administration/trusted_apps', '?page_index=2&page_size=50')
      );

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      expect(store.getState()).toStrictEqual({
        ...initialState,
        ...entriesExistLoadingState(),
        listView: {
          listResourceState: {
            type: 'FailedResourceState',
            error: createServerApiError('Internal Server Error'),
            lastLoadedState: undefined,
          },
          freshDataTimestamp: initialNow,
        },
        active: true,
        location: createLocationState({
          page_index: 2,
          page_size: 50,
        }),
      });

      const infiniteLoopTest = async () => {
        await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');
      };

      await expect(infiniteLoopTest).rejects.not.toBeNull();
    });
  });

  describe('submitting deletion dialog', () => {
    const newNow = 222222;
    const entry = createSampleTrustedApp(3);
    const notFoundError = createServerApiError('Not Found');
    const pagination = { pageIndex: 0, pageSize: 10 };
    const location = createLocationState();
    const getTrustedAppsListResponse = createGetTrustedListAppsResponse(pagination);
    const listView = createLoadedListViewWithPagination(initialNow, pagination);
    const listViewNew = createLoadedListViewWithPagination(newNow, pagination);
    const testStartState = {
      ...initialState,
      ...entriesExistLoadingState(),
      listView,
      active: true,
      location,
    };

    it('does not submit when entry is undefined', async () => {
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockResolvedValue(getTrustedAppsListResponse);
      service.deleteTrustedApp.mockResolvedValue();

      store.dispatch(createUserChangedUrlAction('/administration/trusted_apps'));

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      store.dispatch({ type: 'trustedAppDeletionDialogConfirmed' });

      expect(store.getState()).toStrictEqual({
        ...testStartState,
        deletionDialog: { ...testStartState.deletionDialog, confirmed: true },
      });
    });

    it('submits successfully when entry is defined', async () => {
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockResolvedValue(getTrustedAppsListResponse);
      service.deleteTrustedApp.mockResolvedValue();
      service.getPolicyList.mockResolvedValue(createPolicyResponse());

      store.dispatch(createUserChangedUrlAction('/administration/trusted_apps'));

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      dateNowMock.mockReturnValue(newNow);

      store.dispatch({ type: 'trustedAppDeletionDialogStarted', payload: { entry } });
      store.dispatch({ type: 'trustedAppDeletionDialogConfirmed' });

      expect(store.getState()).toStrictEqual({
        ...testStartState,
        deletionDialog: {
          entry,
          confirmed: true,
          submissionResourceState: {
            type: 'LoadingResourceState',
            previousState: { type: 'UninitialisedResourceState' },
          },
        },
      });

      await spyMiddleware.waitForAction('trustedAppDeletionSubmissionResourceStateChanged');
      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      expect(store.getState()).toStrictEqual({
        ...testStartState,
        ...entriesExistLoadedState(),
        ...policiesLoadedState(),
        listView: listViewNew,
      });
      expect(service.deleteTrustedApp).toBeCalledWith({ id: '3' });
      expect(service.deleteTrustedApp).toBeCalledTimes(1);
    });

    it('does not submit twice', async () => {
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockResolvedValue(getTrustedAppsListResponse);
      service.deleteTrustedApp.mockResolvedValue();
      service.getPolicyList.mockResolvedValue(createPolicyResponse());

      store.dispatch(createUserChangedUrlAction('/administration/trusted_apps'));

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      dateNowMock.mockReturnValue(newNow);

      store.dispatch({ type: 'trustedAppDeletionDialogStarted', payload: { entry } });
      store.dispatch({ type: 'trustedAppDeletionDialogConfirmed' });
      store.dispatch({ type: 'trustedAppDeletionDialogConfirmed' });

      expect(store.getState()).toStrictEqual({
        ...testStartState,
        deletionDialog: {
          entry,
          confirmed: true,
          submissionResourceState: {
            type: 'LoadingResourceState',
            previousState: { type: 'UninitialisedResourceState' },
          },
        },
      });

      await spyMiddleware.waitForAction('trustedAppDeletionSubmissionResourceStateChanged');
      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      expect(store.getState()).toStrictEqual({
        ...testStartState,
        ...entriesExistLoadedState(),
        ...policiesLoadedState(),
        listView: listViewNew,
      });
      expect(service.deleteTrustedApp).toBeCalledWith({ id: '3' });
      expect(service.deleteTrustedApp).toBeCalledTimes(1);
    });

    it('does not submit when server response with failure', async () => {
      const service = createTrustedAppsServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);

      service.getTrustedAppsList.mockResolvedValue(getTrustedAppsListResponse);
      service.deleteTrustedApp.mockRejectedValue({ body: notFoundError });
      service.getPolicyList.mockResolvedValue(createPolicyResponse());

      store.dispatch(createUserChangedUrlAction('/administration/trusted_apps'));

      await spyMiddleware.waitForAction('trustedAppsListResourceStateChanged');

      store.dispatch({ type: 'trustedAppDeletionDialogStarted', payload: { entry } });
      store.dispatch({ type: 'trustedAppDeletionDialogConfirmed' });

      expect(store.getState()).toStrictEqual({
        ...testStartState,
        deletionDialog: {
          entry,
          confirmed: true,
          submissionResourceState: {
            type: 'LoadingResourceState',
            previousState: { type: 'UninitialisedResourceState' },
          },
        },
      });

      await spyMiddleware.waitForAction('trustedAppDeletionSubmissionResourceStateChanged');
      await spyMiddleware.waitForAction('trustedAppsPoliciesStateChanged');

      expect(store.getState()).toStrictEqual({
        ...testStartState,
        ...entriesExistLoadedState(),
        ...policiesLoadedState(),
        deletionDialog: {
          entry,
          confirmed: true,
          submissionResourceState: {
            type: 'FailedResourceState',
            error: notFoundError,
            lastLoadedState: undefined,
          },
        },
      });
      expect(service.deleteTrustedApp).toBeCalledWith({ id: '3' });
      expect(service.deleteTrustedApp).toBeCalledTimes(1);
    });
  });
});
