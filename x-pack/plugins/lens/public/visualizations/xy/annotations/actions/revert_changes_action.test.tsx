/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OverlayRef } from '@kbn/core-mount-utils-browser';
import { IToasts } from '@kbn/core-notifications-browser';
import { PointInTimeEventAnnotationConfig } from '@kbn/event-annotation-common';
import { cloneDeep } from 'lodash';
import {
  XYByReferenceAnnotationLayerConfig,
  XYByValueAnnotationLayerConfig,
  XYState,
} from '../../types';
import { revert } from './revert_changes_action';

describe('revert changes routine', () => {
  const byValueLayer: XYByValueAnnotationLayerConfig = {
    layerId: 'some-id',
    layerType: 'annotations',
    indexPatternId: 'some-index-pattern',
    ignoreGlobalFilters: false,
    annotations: [
      {
        id: 'some-annotation-id',
        type: 'manual',
        key: {
          type: 'point_in_time',
          timestamp: 'timestamp',
        },
      } as PointInTimeEventAnnotationConfig,
    ],
  };

  const byRefLayer: XYByReferenceAnnotationLayerConfig = {
    ...byValueLayer,
    annotationGroupId: 'shouldnt show up',
    __lastSaved: {
      ...cloneDeep(byValueLayer),

      // some differences
      annotations: [
        {
          id: 'some-different-annotation-id',
          type: 'manual',
          key: {
            type: 'point_in_time',
            timestamp: 'timestamp2',
          },
        } as PointInTimeEventAnnotationConfig,
      ],
      ignoreGlobalFilters: true,
      indexPatternId: 'other index pattern',

      title: 'My library group',
      description: '',
      tags: [],
    },
  };

  it('reverts changes', async () => {
    const setState = jest.fn();
    const modal = {
      close: jest.fn(() => Promise.resolve()),
    } as Partial<OverlayRef> as OverlayRef;

    const toasts = { addSuccess: jest.fn() } as Partial<IToasts> as IToasts;

    revert({
      setState,
      layer: byRefLayer,
      state: { layers: [byRefLayer] } as XYState,
      modal,
      toasts,
    });

    expect(setState).toHaveBeenCalled();
    expect((toasts.addSuccess as jest.Mock).mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "text": "The most recently saved version of this annotation group has been restored.",
        "title": "Reverted \\"My library group\\"",
      }
    `);
    expect(modal.close).toHaveBeenCalled();

    const newState = setState.mock.calls[0][0] as XYState;

    expect(
      (newState.layers[0] as XYByReferenceAnnotationLayerConfig).ignoreGlobalFilters
    ).toBeTruthy();
    expect(newState).toMatchSnapshot();
  });
});
