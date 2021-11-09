/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { renderHook } from '@testing-library/react-hooks';
import { useSelectedCells } from './use_selected_cells';
import { ExplorerAppState } from '../../../../common/types/locator';
import { TimefilterContract } from '../../../../../../../src/plugins/data/public';

import { useTimefilter } from '../../contexts/kibana';

jest.mock('../../contexts/kibana');

describe('useSelectedCells', () => {
  test('should not set state when the cell selection is correct', () => {
    (useTimefilter() as jest.Mocked<TimefilterContract>).getBounds.mockReturnValue({
      min: moment(1498824778 * 1000),
      max: moment(1502366798 * 1000),
    });

    const urlState = {
      mlExplorerSwimlane: {
        selectedType: 'overall',
        selectedLanes: ['Overall'],
        selectedTimes: [1498780800, 1498867200],
        showTopFieldValues: true,
        viewByFieldName: 'apache2.access.remote_ip',
        viewByFromPage: 1,
        viewByPerPage: 10,
      },
      mlExplorerFilter: {},
    } as ExplorerAppState;

    const setUrlState = jest.fn();

    const bucketInterval = 86400;

    renderHook(() => useSelectedCells(urlState, setUrlState, bucketInterval));

    expect(setUrlState).not.toHaveBeenCalled();
  });

  test('should reset cell selection when it is completely out of range', () => {
    (useTimefilter() as jest.Mocked<TimefilterContract>).getBounds.mockReturnValue({
      min: moment(1501071178 * 1000),
      max: moment(1502366798 * 1000),
    });

    const urlState = {
      mlExplorerSwimlane: {
        selectedType: 'overall',
        selectedLanes: ['Overall'],
        selectedTimes: [1498780800, 1498867200],
        showTopFieldValues: true,
        viewByFieldName: 'apache2.access.remote_ip',
        viewByFromPage: 1,
        viewByPerPage: 10,
      },
      mlExplorerFilter: {},
    } as ExplorerAppState;

    const setUrlState = jest.fn();

    const bucketInterval = 86400;

    const { result } = renderHook(() => useSelectedCells(urlState, setUrlState, bucketInterval));

    expect(result.current[0]).toEqual({
      lanes: ['Overall'],
      showTopFieldValues: true,
      times: [1498780800, 1498867200],
      type: 'overall',
      viewByFieldName: 'apache2.access.remote_ip',
    });

    expect(setUrlState).toHaveBeenCalledWith({
      mlExplorerSwimlane: {
        viewByFieldName: 'apache2.access.remote_ip',
        viewByFromPage: 1,
        viewByPerPage: 10,
      },
    });
  });

  test('should adjust cell selection time boundaries based on the main time range', () => {
    (useTimefilter() as jest.Mocked<TimefilterContract>).getBounds.mockReturnValue({
      min: moment(1501071178 * 1000),
      max: moment(1502366798 * 1000),
    });

    const urlState = {
      mlExplorerSwimlane: {
        selectedType: 'overall',
        selectedLanes: ['Overall'],
        selectedTimes: [1498780800, 1502366798],
        showTopFieldValues: true,
        viewByFieldName: 'apache2.access.remote_ip',
        viewByFromPage: 1,
        viewByPerPage: 10,
      },
      mlExplorerFilter: {},
    } as ExplorerAppState;

    const setUrlState = jest.fn();

    const bucketInterval = 86400;

    const { result } = renderHook(() => useSelectedCells(urlState, setUrlState, bucketInterval));

    expect(result.current[0]).toEqual({
      lanes: ['Overall'],
      showTopFieldValues: true,
      times: [1498780800, 1502366798],
      type: 'overall',
      viewByFieldName: 'apache2.access.remote_ip',
    });

    expect(setUrlState).toHaveBeenCalledWith({
      mlExplorerSwimlane: {
        selectedLanes: ['Overall'],
        selectedTimes: [1500984778, 1502366798],
        selectedType: 'overall',
        showTopFieldValues: true,
        viewByFieldName: 'apache2.access.remote_ip',
        viewByFromPage: 1,
        viewByPerPage: 10,
      },
    });
  });

  test('should extend single time point selection with a bucket interval value', () => {
    (useTimefilter() as jest.Mocked<TimefilterContract>).getBounds.mockReturnValue({
      min: moment(1498824778 * 1000),
      max: moment(1502366798 * 1000),
    });

    const urlState = {
      mlExplorerSwimlane: {
        selectedType: 'overall',
        selectedLanes: ['Overall'],
        selectedTimes: 1498780800,
        showTopFieldValues: true,
        viewByFieldName: 'apache2.access.remote_ip',
        viewByFromPage: 1,
        viewByPerPage: 10,
      },
      mlExplorerFilter: {},
    } as ExplorerAppState;

    const setUrlState = jest.fn();

    const bucketInterval = 86400;

    const { result } = renderHook(() => useSelectedCells(urlState, setUrlState, bucketInterval));

    expect(result.current[0]).toEqual({
      lanes: ['Overall'],
      showTopFieldValues: true,
      times: [1498780800, 1498867200],
      type: 'overall',
      viewByFieldName: 'apache2.access.remote_ip',
    });
  });
});
