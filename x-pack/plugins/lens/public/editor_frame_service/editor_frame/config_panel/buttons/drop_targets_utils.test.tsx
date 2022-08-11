/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDropProps } from './drop_targets_utils';
import { createMockDatasource } from '../../../../mocks';

describe('getDropProps', () => {
  it('should run datasource getDropProps if exists', () => {
    const mockDatasource = createMockDatasource('testDatasource');
    getDropProps(
      {
        state: 'datasourceState',
        target: {
          columnId: 'col1',
          groupId: 'x',
          layerId: 'first',
          filterOperations: () => true,
        },
        source: {
          columnId: 'col1',
          groupId: 'x',
          layerId: 'first',
          id: 'annotationColumn2',
          humanData: { label: 'Event' },
        },
      },
      mockDatasource
    );
    expect(mockDatasource.getDropProps).toHaveBeenCalled();
  });
  describe('no datasource', () => {
    it('returns reorder for the same group existing columns', () => {
      expect(
        getDropProps({
          state: 'datasourceState',
          target: {
            columnId: 'annotationColumn',
            groupId: 'xAnnotations',
            layerId: 'second',
            filterOperations: () => true,
          },
          source: {
            columnId: 'annotationColumn2',
            groupId: 'xAnnotations',
            layerId: 'second',
            id: 'annotationColumn2',
            humanData: { label: 'Event' },
          },
        })
      ).toEqual({ dropTypes: ['reorder'] });
    });
    it('returns duplicate for the same group existing column and not existing column', () => {
      expect(
        getDropProps({
          state: 'datasourceState',
          target: {
            columnId: 'annotationColumn',
            groupId: 'xAnnotations',
            layerId: 'second',
            isNewColumn: true,
            filterOperations: () => true,
          },
          source: {
            columnId: 'annotationColumn2',
            groupId: 'xAnnotations',
            layerId: 'second',
            id: 'annotationColumn2',
            humanData: { label: 'Event' },
          },
        })
      ).toEqual({ dropTypes: ['duplicate_compatible'] });
    });
    it('returns replace_duplicate and replace for replacing to different layer', () => {
      expect(
        getDropProps({
          state: 'datasourceState',
          target: {
            columnId: 'annotationColumn',
            groupId: 'xAnnotations',
            layerId: 'first',
            filterOperations: () => true,
          },
          source: {
            columnId: 'annotationColumn2',
            groupId: 'xAnnotations',
            layerId: 'second',
            id: 'annotationColumn2',
            humanData: { label: 'Event' },
          },
        })
      ).toEqual({
        dropTypes: ['replace_compatible', 'replace_duplicate_compatible', 'swap_compatible'],
      });
    });
    it('returns duplicate and move for replacing to different layer for empty column', () => {
      expect(
        getDropProps({
          state: 'datasourceState',
          target: {
            columnId: 'annotationColumn',
            groupId: 'xAnnotations',
            layerId: 'first',
            isNewColumn: true,
            filterOperations: () => true,
          },
          source: {
            columnId: 'annotationColumn2',
            groupId: 'xAnnotations',
            layerId: 'second',
            id: 'annotationColumn2',
            humanData: { label: 'Event' },
          },
        })
      ).toEqual({
        dropTypes: ['move_compatible', 'duplicate_compatible'],
      });
    });
  });
});
