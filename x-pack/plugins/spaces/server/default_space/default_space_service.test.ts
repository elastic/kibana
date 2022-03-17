/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { first } from 'rxjs/operators';

import { nextTick } from '@kbn/test-jest-helpers';
import type { Writable } from '@kbn/utility-types';
import type { CoreStatus, SavedObjectsRepository, ServiceStatusLevel } from 'src/core/server';
import { SavedObjectsErrorHelpers, ServiceStatusLevels } from 'src/core/server';
import { coreMock, loggingSystemMock } from 'src/core/server/mocks';

import type { ILicense } from '../../../licensing/server';
import { licensingMock } from '../../../licensing/server/mocks';
import { SpacesLicenseService } from '../../common/licensing';
import {
  DefaultSpaceService,
  RETRY_DURATION_MAX,
  RETRY_SCALE_DURATION,
} from './default_space_service';

const advanceRetry = async (initializeCount: number) => {
  await Promise.resolve();
  let duration = initializeCount * RETRY_SCALE_DURATION;
  if (duration > RETRY_DURATION_MAX) {
    duration = RETRY_DURATION_MAX;
  }
  jest.advanceTimersByTime(duration);
};

interface SetupOpts {
  elasticsearchStatus: ServiceStatusLevel;
  savedObjectsStatus: ServiceStatusLevel;
  license: ILicense;
}
const setup = ({ elasticsearchStatus, savedObjectsStatus, license }: SetupOpts) => {
  const core = coreMock.createSetup();
  const { status } = core;
  status.core$ = new Rx.BehaviorSubject({
    elasticsearch: {
      level: elasticsearchStatus,
      summary: '',
    },
    savedObjects: {
      level: savedObjectsStatus,
      summary: '',
    },
  }) as unknown as Rx.Observable<CoreStatus>;

  const { savedObjects } = coreMock.createStart();
  const repository = savedObjects.createInternalRepository() as jest.Mocked<SavedObjectsRepository>;
  // simulate space not found
  repository.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());
  repository.create.mockReturnValue(Promise.resolve({} as any));

  const license$ = new Rx.BehaviorSubject(license);

  const logger = loggingSystemMock.createLogger();

  const { license: spacesLicense } = new SpacesLicenseService().setup({ license$ });

  const defaultSpaceService = new DefaultSpaceService();
  const { serviceStatus$ } = defaultSpaceService.setup({
    coreStatus: status,
    getSavedObjects: () => Promise.resolve(savedObjects),
    license$,
    logger,
    spacesLicense,
  });

  return {
    coreStatus: status as unknown as { core$: Rx.BehaviorSubject<CoreStatus> },
    serviceStatus$,
    logger,
    license$,
    savedObjects,
    repository,
  };
};

test(`does not initialize if elasticsearch is unavailable`, async () => {
  const { repository, serviceStatus$ } = setup({
    elasticsearchStatus: ServiceStatusLevels.unavailable,
    savedObjectsStatus: ServiceStatusLevels.available,
    license: licensingMock.createLicense({
      license: {
        status: 'active',
        type: 'gold',
      },
    }),
  });

  await nextTick();

  expect(repository.get).not.toHaveBeenCalled();
  expect(repository.create).not.toHaveBeenCalled();

  const status = await serviceStatus$.pipe(first()).toPromise();
  expect(status.level).toEqual(ServiceStatusLevels.unavailable);
  expect(status.summary).toMatchInlineSnapshot(`"required core services are not ready"`);
});

test(`does not initialize if savedObjects is unavailable`, async () => {
  const { serviceStatus$, repository } = setup({
    elasticsearchStatus: ServiceStatusLevels.available,
    savedObjectsStatus: ServiceStatusLevels.unavailable,
    license: licensingMock.createLicense({
      license: {
        status: 'active',
        type: 'gold',
      },
    }),
  });

  await nextTick();

  expect(repository.get).not.toHaveBeenCalled();
  expect(repository.create).not.toHaveBeenCalled();
  const status = await serviceStatus$.pipe(first()).toPromise();
  expect(status.level).toEqual(ServiceStatusLevels.unavailable);
  expect(status.summary).toMatchInlineSnapshot(`"required core services are not ready"`);
});

test(`does not initialize if the license is unavailable`, async () => {
  const license = licensingMock.createLicense({
    license: { type: ' ', status: ' ' } as unknown as ILicense,
  }) as Writable<ILicense>;
  license.isAvailable = false;

  const { serviceStatus$, repository } = setup({
    elasticsearchStatus: ServiceStatusLevels.available,
    savedObjectsStatus: ServiceStatusLevels.available,
    license,
  });

  await nextTick();

  expect(repository.get).not.toHaveBeenCalled();
  expect(repository.create).not.toHaveBeenCalled();
  const status = await serviceStatus$.pipe(first()).toPromise();
  expect(status.level).toEqual(ServiceStatusLevels.unavailable);
  expect(status.summary).toMatchInlineSnapshot(`"missing or invalid license"`);
});

test(`initializes once all dependencies are met`, async () => {
  const { repository, coreStatus, serviceStatus$ } = setup({
    elasticsearchStatus: ServiceStatusLevels.available,
    savedObjectsStatus: ServiceStatusLevels.unavailable,
    license: licensingMock.createLicense({
      license: {
        type: 'gold',
        status: 'active',
      },
    }),
  });

  await nextTick();

  expect(repository.get).not.toHaveBeenCalled();
  expect(repository.create).not.toHaveBeenCalled();

  const status = await serviceStatus$.pipe(first()).toPromise();
  expect(status.level).toEqual(ServiceStatusLevels.unavailable);
  expect(status.summary).toMatchInlineSnapshot(`"required core services are not ready"`);

  coreStatus.core$.next({
    elasticsearch: {
      level: ServiceStatusLevels.available,
      summary: '',
    },
    savedObjects: {
      level: ServiceStatusLevels.available,
      summary: '',
    },
  });

  await nextTick();

  expect(repository.get).toHaveBeenCalled();
  expect(repository.create).toHaveBeenCalled();

  const nextStatus = await serviceStatus$.pipe(first()).toPromise();
  expect(nextStatus.level).toEqual(ServiceStatusLevels.available);
  expect(nextStatus.summary).toMatchInlineSnapshot(`"ready"`);
});

test('maintains unavailable status if default space cannot be created', async () => {
  const { repository, serviceStatus$ } = setup({
    elasticsearchStatus: ServiceStatusLevels.available,
    savedObjectsStatus: ServiceStatusLevels.available,
    license: licensingMock.createLicense({
      license: {
        type: 'gold',
        status: 'active',
      },
    }),
  });

  repository.create.mockRejectedValue(new Error('something bad happened'));

  await nextTick();

  expect(repository.get).toHaveBeenCalled();
  expect(repository.create).toHaveBeenCalled();

  const status = await serviceStatus$.pipe(first()).toPromise();
  expect(status.level).toEqual(ServiceStatusLevels.unavailable);
  expect(status.summary).toMatchInlineSnapshot(
    `"Error creating default space: something bad happened"`
  );
});

test('retries operation', async () => {
  jest.useFakeTimers();

  const { repository, serviceStatus$ } = setup({
    elasticsearchStatus: ServiceStatusLevels.available,
    savedObjectsStatus: ServiceStatusLevels.available,
    license: licensingMock.createLicense({
      license: {
        type: 'gold',
        status: 'active',
      },
    }),
  });

  repository.create.mockRejectedValue(new Error('something bad happened'));

  await nextTick();

  expect(repository.get).toHaveBeenCalledTimes(1);
  expect(repository.create).toHaveBeenCalledTimes(1);

  let status = await serviceStatus$.pipe(first()).toPromise();
  expect(status.level).toEqual(ServiceStatusLevels.unavailable);
  expect(status.summary).toMatchInlineSnapshot(
    `"Error creating default space: something bad happened"`
  );

  await advanceRetry(1);
  await nextTick();

  expect(repository.get).toHaveBeenCalledTimes(2);
  expect(repository.create).toHaveBeenCalledTimes(2);

  status = await serviceStatus$.pipe(first()).toPromise();
  expect(status.level).toEqual(ServiceStatusLevels.unavailable);
  expect(status.summary).toMatchInlineSnapshot(
    `"Error creating default space: something bad happened"`
  );

  repository.create.mockResolvedValue({} as any);

  // retries are scaled back, so this should not cause the repository to be invoked
  await advanceRetry(1);
  await nextTick();

  expect(repository.get).toHaveBeenCalledTimes(2);
  expect(repository.create).toHaveBeenCalledTimes(2);

  status = await serviceStatus$.pipe(first()).toPromise();
  expect(status.level).toEqual(ServiceStatusLevels.unavailable);
  expect(status.summary).toMatchInlineSnapshot(
    `"Error creating default space: something bad happened"`
  );

  await advanceRetry(1);
  await nextTick();

  expect(repository.get).toHaveBeenCalledTimes(3);
  expect(repository.create).toHaveBeenCalledTimes(3);

  status = await serviceStatus$.pipe(first()).toPromise();
  expect(status.level).toEqual(ServiceStatusLevels.available);
  expect(status.summary).toMatchInlineSnapshot(`"ready"`);
});
