/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable max-classes-per-file */

import { AbstractLayer } from './layer';
import { ISource } from '../sources/source';
import { IStyle } from '../styles/style';
import { AGG_TYPE, FIELD_ORIGIN, LAYER_STYLE_TYPE, VECTOR_STYLES } from '../../../common/constants';
import { ESTermSourceDescriptor, VectorStyleDescriptor } from '../../../common/descriptor_types';
import { getDefaultDynamicProperties } from '../styles/vector/vector_style_defaults';

jest.mock('uuid/v4', () => {
  return function () {
    return '12345';
  };
});

class MockLayer extends AbstractLayer {}

class MockSource {
  private readonly _fitToBounds: boolean;
  constructor({ fitToBounds = true } = {}) {
    this._fitToBounds = fitToBounds;
  }
  cloneDescriptor() {
    return {};
  }

  getDisplayName() {
    return 'mySource';
  }

  async supportsFitToBounds() {
    return this._fitToBounds;
  }
}

class MockStyle {}

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
      const layerDescriptor = AbstractLayer.createDescriptor({
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
              type: 'joinSource',
            },
          },
        ],
      });
      const layer = new MockLayer({
        layerDescriptor,
        source: (new MockSource() as unknown) as ISource,
        style: (new MockStyle() as unknown) as IStyle,
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
      const layerDescriptor = AbstractLayer.createDescriptor({
        style: styleDescriptor,
        joins: [
          {
            leftField: 'iso2',
            right: ({
              id: '557d0f15',
              indexPatternId: 'myIndexPattern',
              indexPatternTitle: 'logs-*',
              term: 'myTermField',
              type: 'joinSource',
            } as unknown) as ESTermSourceDescriptor,
          },
        ],
      });
      const layer = new MockLayer({
        layerDescriptor,
        source: (new MockSource() as unknown) as ISource,
        style: (new MockStyle() as unknown) as IStyle,
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

describe('isFittable', () => {
  [
    {
      isVisible: true,
      fitToBounds: true,
      canFit: true,
    },
    {
      isVisible: false,
      fitToBounds: true,
      canFit: false,
    },
    {
      isVisible: true,
      fitToBounds: false,
      canFit: false,
    },
    {
      isVisible: false,
      fitToBounds: false,
      canFit: false,
    },
  ].forEach((test) => {
    it(`Should take into account layer visibility and bounds-retrieval: ${JSON.stringify(
      test
    )}`, async () => {
      const layerDescriptor = AbstractLayer.createDescriptor({ visible: test.isVisible });
      const layer = new MockLayer({
        layerDescriptor,
        source: (new MockSource({ fitToBounds: test.fitToBounds }) as unknown) as ISource,
        style: (new MockStyle() as unknown) as IStyle,
      });
      expect(await layer.isFittable()).toBe(test.canFit);
    });
  });
});
