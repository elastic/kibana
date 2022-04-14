/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

jest.mock('../../styles/vector/vector_style', () => ({
  VectorStyle: class MockVectorStyle {},
}));

jest.mock('uuid/v4', () => {
  return function () {
    return '12345';
  };
});

import {
  AGG_TYPE,
  FIELD_ORIGIN,
  LAYER_STYLE_TYPE,
  SOURCE_TYPES,
  VECTOR_STYLES,
} from '../../../../common/constants';
import { ESTermSourceDescriptor, VectorStyleDescriptor } from '../../../../common/descriptor_types';
import { getDefaultDynamicProperties } from '../../styles/vector/vector_style_defaults';
import { IVectorSource } from '../../sources/vector_source';
import { AbstractVectorLayer } from './vector_layer';

class MockSource {
  cloneDescriptor() {
    return {};
  }

  getDisplayName() {
    return 'mySource';
  }
}

describe('cloneDescriptor', () => {
  describe('with joins', () => {
    const styleDescriptor = {
      type: LAYER_STYLE_TYPE.VECTOR,
      properties: {
        ...getDefaultDynamicProperties(),
      },
    } as VectorStyleDescriptor;
    // @ts-expect-error
    styleDescriptor.properties[VECTOR_STYLES.FILL_COLOR].options.field = {
      name: '__kbnjoin__count__557d0f15',
      origin: FIELD_ORIGIN.JOIN,
    };
    // @ts-expect-error
    styleDescriptor.properties[VECTOR_STYLES.LINE_COLOR].options.field = {
      name: 'bytes',
      origin: FIELD_ORIGIN.SOURCE,
    };
    // @ts-expect-error
    styleDescriptor.properties[VECTOR_STYLES.LABEL_BORDER_COLOR].options.field = {
      name: '__kbnjoin__count__6666666666',
      origin: FIELD_ORIGIN.JOIN,
    };

    test('Should update data driven styling properties using join fields', async () => {
      const layerDescriptor = AbstractVectorLayer.createDescriptor({
        style: styleDescriptor,
        joins: [
          {
            leftField: 'iso2',
            right: {
              id: '557d0f15',
              indexPatternId: 'myIndexPattern',
              indexPatternTitle: 'logs-*',
              metrics: [{ type: AGG_TYPE.COUNT }],
              term: 'myTermField',
              type: SOURCE_TYPES.ES_TERM_SOURCE,
              applyGlobalQuery: true,
              applyGlobalTime: true,
              applyForceRefresh: true,
            },
          },
        ],
      });
      const layer = new AbstractVectorLayer({
        layerDescriptor,
        source: new MockSource() as unknown as IVectorSource,
        customIcons: [],
      });
      const clonedDescriptor = await layer.cloneDescriptor();
      const clonedStyleProps = (clonedDescriptor.style as VectorStyleDescriptor).properties;
      // Should update style field belonging to join
      // @ts-expect-error
      expect(clonedStyleProps[VECTOR_STYLES.FILL_COLOR].options.field.name).toEqual(
        '__kbnjoin__count__12345'
      );
      // Should not update style field belonging to source
      // @ts-expect-error
      expect(clonedStyleProps[VECTOR_STYLES.LINE_COLOR].options.field.name).toEqual('bytes');
      // Should not update style feild belonging to different join
      // @ts-expect-error
      expect(clonedStyleProps[VECTOR_STYLES.LABEL_BORDER_COLOR].options.field.name).toEqual(
        '__kbnjoin__count__6666666666'
      );
    });

    test('Should update data driven styling properties using join fields when metrics are not provided', async () => {
      const layerDescriptor = AbstractVectorLayer.createDescriptor({
        style: styleDescriptor,
        joins: [
          {
            leftField: 'iso2',
            right: {
              id: '557d0f15',
              indexPatternId: 'myIndexPattern',
              indexPatternTitle: 'logs-*',
              term: 'myTermField',
              type: 'joinSource',
            } as unknown as ESTermSourceDescriptor,
          },
        ],
      });
      const layer = new AbstractVectorLayer({
        layerDescriptor,
        source: new MockSource() as unknown as IVectorSource,
        customIcons: [],
      });
      const clonedDescriptor = await layer.cloneDescriptor();
      const clonedStyleProps = (clonedDescriptor.style as VectorStyleDescriptor).properties;
      // Should update style field belonging to join
      // @ts-expect-error
      expect(clonedStyleProps[VECTOR_STYLES.FILL_COLOR].options.field.name).toEqual(
        '__kbnjoin__count__12345'
      );
    });
  });
});
