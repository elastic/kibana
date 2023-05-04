/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';

import type { ConfigType } from '../config';
import { spacesConfig } from '../lib/__fixtures__';
import type { ISpacesClient } from './spaces_client';
import { SpacesClient } from './spaces_client';
import { SpacesClientService } from './spaces_client_service';

const debugLogger = jest.fn();

describe('SpacesClientService', () => {
  describe('#setup', () => {
    it('allows a single repository factory to be set', () => {
      const service = new SpacesClientService(debugLogger);
      const setup = service.setup({ config$: Rx.of(spacesConfig) });

      const repositoryFactory = jest.fn();
      setup.setClientRepositoryFactory(repositoryFactory);

      expect(() =>
        setup.setClientRepositoryFactory(repositoryFactory)
      ).toThrowErrorMatchingInlineSnapshot(`"Repository factory has already been set"`);
    });

    it('allows a single client wrapper to be set', () => {
      const service = new SpacesClientService(debugLogger);
      const setup = service.setup({ config$: Rx.of(spacesConfig) });

      const clientWrapper = jest.fn();
      setup.registerClientWrapper(clientWrapper);

      expect(() => setup.registerClientWrapper(clientWrapper)).toThrowErrorMatchingInlineSnapshot(
        `"Client wrapper has already been set"`
      );
    });
  });

  describe('#start', () => {
    it('throws if config is not available', () => {
      const service = new SpacesClientService(debugLogger);
      service.setup({ config$: new Rx.Observable<ConfigType>() });
      const coreStart = coreMock.createStart();
      const start = service.start(coreStart);

      const request = httpServerMock.createKibanaRequest();

      expect(() => start.createSpacesClient(request)).toThrowErrorMatchingInlineSnapshot(
        `"Initialization error: spaces config is not available"`
      );
    });

    describe('without a custom repository factory or wrapper', () => {
      it('returns an instance of the spaces client using the scoped repository', () => {
        const service = new SpacesClientService(debugLogger);
        service.setup({ config$: Rx.of(spacesConfig) });

        const coreStart = coreMock.createStart();
        const start = service.start(coreStart);

        const request = httpServerMock.createKibanaRequest();
        const client = start.createSpacesClient(request);
        expect(client).toBeInstanceOf(SpacesClient);

        expect(coreStart.savedObjects.createScopedRepository).toHaveBeenCalledWith(request, [
          'space',
        ]);
        expect(coreStart.savedObjects.createInternalRepository).not.toHaveBeenCalled();
      });
    });

    it('uses the custom repository factory when set', () => {
      const service = new SpacesClientService(debugLogger);
      const setup = service.setup({ config$: Rx.of(spacesConfig) });

      const customRepositoryFactory = jest.fn();
      setup.setClientRepositoryFactory(customRepositoryFactory);

      const coreStart = coreMock.createStart();
      const start = service.start(coreStart);

      const request = httpServerMock.createKibanaRequest();
      const client = start.createSpacesClient(request);
      expect(client).toBeInstanceOf(SpacesClient);

      expect(coreStart.savedObjects.createScopedRepository).not.toHaveBeenCalled();
      expect(coreStart.savedObjects.createInternalRepository).not.toHaveBeenCalled();

      expect(customRepositoryFactory).toHaveBeenCalledWith(request, coreStart.savedObjects);
    });

    it('wraps the client in the wrapper when registered', () => {
      const service = new SpacesClientService(debugLogger);
      const setup = service.setup({ config$: Rx.of(spacesConfig) });

      const wrapper = Symbol() as unknown as ISpacesClient;

      const clientWrapper = jest.fn().mockReturnValue(wrapper);
      setup.registerClientWrapper(clientWrapper);

      const coreStart = coreMock.createStart();
      const start = service.start(coreStart);

      const request = httpServerMock.createKibanaRequest();
      const client = start.createSpacesClient(request);

      expect(client).toBe(wrapper);
      expect(clientWrapper).toHaveBeenCalledTimes(1);
      expect(clientWrapper).toHaveBeenCalledWith(request, expect.any(SpacesClient));

      expect(coreStart.savedObjects.createScopedRepository).toHaveBeenCalledWith(request, [
        'space',
      ]);
      expect(coreStart.savedObjects.createInternalRepository).not.toHaveBeenCalled();
    });

    it('wraps the client in the wrapper when registered, using the custom repository factory when configured', () => {
      const service = new SpacesClientService(debugLogger);
      const setup = service.setup({ config$: Rx.of(spacesConfig) });

      const customRepositoryFactory = jest.fn();
      setup.setClientRepositoryFactory(customRepositoryFactory);

      const wrapper = Symbol() as unknown as ISpacesClient;

      const clientWrapper = jest.fn().mockReturnValue(wrapper);
      setup.registerClientWrapper(clientWrapper);

      const coreStart = coreMock.createStart();
      const start = service.start(coreStart);

      const request = httpServerMock.createKibanaRequest();
      const client = start.createSpacesClient(request);

      expect(client).toBe(wrapper);
      expect(clientWrapper).toHaveBeenCalledTimes(1);
      expect(clientWrapper).toHaveBeenCalledWith(request, expect.any(SpacesClient));

      expect(coreStart.savedObjects.createScopedRepository).not.toHaveBeenCalled();
      expect(coreStart.savedObjects.createInternalRepository).not.toHaveBeenCalled();

      expect(customRepositoryFactory).toHaveBeenCalledWith(request, coreStart.savedObjects);
    });
  });
});
