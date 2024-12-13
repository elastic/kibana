/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { makeDefaultServices } from '../mocks';
import type { LensAppServices } from './types';
import { redirectToDashboard } from './save_modal_container_helpers';
import { LensSerializedState } from '..';

describe('redirectToDashboard', () => {
  const embeddableInput = {
    test: 'test',
  } as unknown as LensSerializedState;
  const mockServices = makeDefaultServices();

  it('should call the navigateToWithEmbeddablePackage with the correct args if originatingApp is given', () => {
    const navigateToWithEmbeddablePackageSpy = jest.fn();
    const transferService = {
      ...mockServices.stateTransfer,
      navigateToWithEmbeddablePackage: navigateToWithEmbeddablePackageSpy,
    } as unknown as LensAppServices['stateTransfer'];
    redirectToDashboard({
      embeddableInput,
      dashboardId: 'id',
      originatingApp: 'security',
      getOriginatingPath: jest.fn(),
      stateTransfer: transferService,
    });
    expect(navigateToWithEmbeddablePackageSpy).toHaveBeenCalledWith('security', {
      path: '#/view/id',
      state: { input: { test: 'test' }, type: 'lens' },
    });
  });

  it('should call the navigateToWithEmbeddablePackage with the correct args if originatingApp is an empty string', () => {
    const navigateToWithEmbeddablePackageSpy = jest.fn();
    const transferService = {
      ...mockServices.stateTransfer,
      navigateToWithEmbeddablePackage: navigateToWithEmbeddablePackageSpy,
    } as unknown as LensAppServices['stateTransfer'];
    redirectToDashboard({
      embeddableInput,
      dashboardId: 'id',
      originatingApp: '',
      getOriginatingPath: jest.fn(),
      stateTransfer: transferService,
    });
    expect(navigateToWithEmbeddablePackageSpy).toHaveBeenCalledWith('dashboards', {
      path: '#/view/id',
      state: { input: { test: 'test' }, type: 'lens' },
    });
  });
});
