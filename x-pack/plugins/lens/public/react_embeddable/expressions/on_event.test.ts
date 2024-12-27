/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionRendererEvent } from '@kbn/expressions-plugin/public';
import { getLensApiMock, getLensRuntimeStateMock, makeEmbeddableServices } from '../mocks';
import { LensApi, LensEmbeddableStartServices, LensPublicCallbacks } from '../types';
import { prepareEventHandler } from './on_event';
import { faker } from '@faker-js/faker';
import {
  LENS_EDIT_PAGESIZE_ACTION,
  LENS_EDIT_RESIZE_ACTION,
  LENS_EDIT_SORT_ACTION,
  LENS_TOGGLE_ACTION,
} from '../../visualizations/datatable/components/constants';

describe('Embeddable interaction event handlers', () => {
  beforeEach(() => {
    // LensAPI mock is a static mock, so we need to reset it between tests
    jest.resetAllMocks();
  });

  function getCallbacks(shouldPreventDefault?: boolean) {
    if (!shouldPreventDefault) {
      return { onFilter: jest.fn(), onBrushEnd: jest.fn(), onTableRowClick: jest.fn() };
    }
    return {
      onFilter: jest.fn((event) => event.preventDefault()),
      onBrushEnd: jest.fn((event) => event.preventDefault()),
      onTableRowClick: jest.fn((event) => event.preventDefault()),
    };
  }

  function getHandler(
    api: LensApi = getLensApiMock(),
    callbacks: LensPublicCallbacks = getCallbacks(),
    services: LensEmbeddableStartServices = makeEmbeddableServices(),
    disableTriggers: boolean = false
  ) {
    return prepareEventHandler(
      api,
      jest.fn(() => getLensRuntimeStateMock()),
      callbacks,
      services,
      disableTriggers
    );
  }

  function getTable() {
    return { columns: { test: { meta: { field: '@timestamp', sourceParams: {} } } } };
  }

  async function submitEvent(event: ExpressionRendererEvent, callPreventDefault: boolean = false) {
    const onEditAction = jest.fn();
    const callbacks = getCallbacks(callPreventDefault);
    const services = makeEmbeddableServices(undefined, undefined, {
      visOverrides: { id: 'lnsXY', onEditAction },
    });
    const lensApi = getLensApiMock();
    const handler = getHandler(lensApi, callbacks, services);

    await handler(event);

    return {
      reSubmit: (newEvent: ExpressionRendererEvent) => handler(newEvent),
      callbacks,
      getTrigger: services.uiActions.getTrigger,
      updateAttributes: lensApi.updateAttributes,
      onEditAction,
    };
  }

  it('should call onTableRowClick event ', async () => {
    const event = {
      name: 'tableRowContextMenuClick',
      data: { rowIndex: 1, table: getTable() },
    };
    const { callbacks } = await submitEvent(event);
    expect(callbacks.onTableRowClick).toHaveBeenCalledWith(expect.objectContaining(event.data));
  });
  it('should prevent onTableRowClick trigger when calling preventDefault ', async () => {
    const event = {
      name: 'tableRowContextMenuClick',
      data: { rowIndex: 1, table: getTable() },
    };
    const { getTrigger } = await submitEvent(event, true);
    expect(getTrigger).not.toHaveBeenCalled();
  });
  it('should call onBrush event on filter call ', async () => {
    const event = {
      name: 'brush',
      data: { column: 'test', range: [1, 2], table: getTable() },
    };
    const { callbacks } = await submitEvent(event);
    expect(callbacks.onBrushEnd).toHaveBeenCalledWith(expect.objectContaining(event.data));
  });
  it('should prevent the onBrush trigger when calling preventDefault', async () => {
    const event = {
      name: 'brush',
      data: { column: 'test', range: [1, 2], table: getTable() },
    };
    const { getTrigger } = await submitEvent(event, true);
    expect(getTrigger).not.toHaveBeenCalled();
  });
  it('should call onFilter event on filter call ', async () => {
    const event = {
      name: 'filter',
      data: {
        data: [{ value: faker.number.int(), row: 1, column: 'test', table: getTable() }],
      },
    };
    const { callbacks } = await submitEvent(event);
    expect(callbacks.onFilter).toHaveBeenCalledWith(expect.objectContaining(event.data));
  });
  it('should prevent the onFilter trigger when calling preventDefault', async () => {
    const event = {
      name: 'filter',
      data: {
        data: [{ value: faker.number.int(), row: 1, column: 'test', table: getTable() }],
      },
    };
    const { getTrigger } = await submitEvent(event, true);
    expect(getTrigger).not.toHaveBeenCalled();
  });

  it('should reload on edit events', async () => {
    const { reSubmit, onEditAction, updateAttributes } = await submitEvent({
      name: 'edit',
      data: { action: LENS_EDIT_SORT_ACTION },
    });

    expect(onEditAction).toHaveBeenCalled();
    expect(updateAttributes).toHaveBeenCalled();

    await reSubmit({ name: 'edit', data: { action: LENS_EDIT_RESIZE_ACTION } });

    expect(onEditAction).toHaveBeenCalled();
    expect(updateAttributes).toHaveBeenCalled();

    await reSubmit({ name: 'edit', data: { action: LENS_TOGGLE_ACTION } });

    expect(onEditAction).toHaveBeenCalled();
    expect(updateAttributes).toHaveBeenCalled();

    await reSubmit({ name: 'edit', data: { action: LENS_EDIT_PAGESIZE_ACTION } });

    expect(onEditAction).toHaveBeenCalled();
    expect(updateAttributes).toHaveBeenCalled();
  });

  it('should not reload on non-edit events', async () => {
    const { reSubmit, onEditAction, updateAttributes } = await submitEvent({
      name: 'tableRowContextMenuClick',
      data: { rowIndex: 1, table: getTable() },
    });

    expect(onEditAction).not.toHaveBeenCalled();
    expect(updateAttributes).not.toHaveBeenCalled();

    await reSubmit({
      name: 'brush',
      data: { column: 'test', range: [1, 2], table: getTable() },
    });

    expect(onEditAction).not.toHaveBeenCalled();
    expect(updateAttributes).not.toHaveBeenCalled();

    await reSubmit({
      name: 'filter',
      data: {
        data: [{ value: faker.number.int(), row: 1, column: 'test', table: getTable() }],
      },
    });

    expect(onEditAction).not.toHaveBeenCalled();
    expect(updateAttributes).not.toHaveBeenCalled();
  });
});
