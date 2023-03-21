/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { fakeSchedulers } from 'rxjs-marbles/jest';
import { firstValueFrom } from 'rxjs';
import { MetadataService } from './metadata_service';

jest.mock('rxjs', () => {
  const RxJs = jest.requireActual('rxjs');

  return {
    ...RxJs,
    debounceTime: () => RxJs.identity, // Remove the delaying effect of debounceTime
  };
});

describe('MetadataService', () => {
  jest.useFakeTimers({ legacyFakeTimers: true });

  let metadataService: MetadataService;

  beforeEach(() => {
    metadataService = new MetadataService({ metadata_refresh_interval: moment.duration(1, 's') });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('setup', () => {
    test('emits the initial metadata', async () => {
      const initialMetadata = { userId: 'fake-user-id', kibanaVersion: 'version' };
      metadataService.setup(initialMetadata);
      await expect(firstValueFrom(metadataService.userMetadata$)).resolves.toStrictEqual(
        initialMetadata
      );
    });

    test(
      'emits inTrial when trialEndDate is provided',
      fakeSchedulers(async (advance) => {
        const initialMetadata = {
          userId: 'fake-user-id',
          kibanaVersion: 'version',
          trialEndDate: new Date(0).toISOString(),
        };
        metadataService.setup(initialMetadata);

        // Still equals initialMetadata
        await expect(firstValueFrom(metadataService.userMetadata$)).resolves.toStrictEqual(
          initialMetadata
        );

        // After scheduler kicks in...
        advance(1); // The timer kicks in first on 0 (but let's give us 1ms so the trial is expired)
        await new Promise((resolve) => process.nextTick(resolve)); // The timer triggers a promise, so we need to skip to the next tick
        await expect(firstValueFrom(metadataService.userMetadata$)).resolves.toStrictEqual({
          ...initialMetadata,
          inTrial: false,
        });
      })
    );
  });

  describe('start', () => {
    const initialMetadata = { userId: 'fake-user-id', kibanaVersion: 'version' };
    beforeEach(() => {
      metadataService.setup(initialMetadata);
    });

    test(
      'emits hasData after resolving the `hasUserDataView`',
      fakeSchedulers(async (advance) => {
        metadataService.start({ hasDataFetcher: async () => ({ hasData: true }) });

        // Still equals initialMetadata
        await expect(firstValueFrom(metadataService.userMetadata$)).resolves.toStrictEqual(
          initialMetadata
        );

        // After scheduler kicks in...
        advance(1); // The timer kicks in first on 0 (but let's give us 1ms so the trial is expired)
        await new Promise((resolve) => process.nextTick(resolve)); // The timer triggers a promise, so we need to skip to the next tick
        await expect(firstValueFrom(metadataService.userMetadata$)).resolves.toStrictEqual({
          ...initialMetadata,
          hasData: true,
        });
      })
    );
  });
});
