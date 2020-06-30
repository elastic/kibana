/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MVTSingleLayerVectorSource } from './mvt_single_layer_vector_source';
import { MVT_FIELD_TYPE, SOURCE_TYPES } from '../../../../common/constants';
import { TiledSingleLayerVectorSourceDescriptor } from '../../../../common/descriptor_types';

const descriptor: TiledSingleLayerVectorSourceDescriptor = {
  type: SOURCE_TYPES.MVT_SINGLE_LAYER,
  urlTemplate: 'https://example.com/{x}/{y}/{z}.pbf',
  layerName: 'foobar',
  minSourceZoom: 4,
  maxSourceZoom: 14,
  fields: [],
  tooltipProperties: [],
};

describe('getUrlTemplateWithMeta', () => {
  it('should echo configuration', async () => {
    const source = new MVTSingleLayerVectorSource(descriptor);
    const config = await source.getUrlTemplateWithMeta();
    expect(config.urlTemplate).toEqual(descriptor.urlTemplate);
    expect(config.layerName).toEqual(descriptor.layerName);
    expect(config.minSourceZoom).toEqual(descriptor.minSourceZoom);
    expect(config.maxSourceZoom).toEqual(descriptor.maxSourceZoom);
  });
});

describe('canFormatFeatureProperties', () => {
  it('false if no tooltips', async () => {
    const source = new MVTSingleLayerVectorSource(descriptor);
    expect(source.canFormatFeatureProperties()).toEqual(false);
  });
  it('true if tooltip', async () => {
    const descriptorWithTooltips = {
      ...descriptor,
      fields: [{ name: 'foobar', type: MVT_FIELD_TYPE.STRING }],
      tooltipProperties: ['foobar'],
    };
    const source = new MVTSingleLayerVectorSource(descriptorWithTooltips);
    expect(source.canFormatFeatureProperties()).toEqual(true);
  });
});

describe('filterAndFormatPropertiesToHtml', () => {
  const descriptorWithFields = {
    ...descriptor,
    fields: [
      {
        name: 'foo',
        type: MVT_FIELD_TYPE.STRING,
      },
      {
        name: 'food',
        type: MVT_FIELD_TYPE.STRING,
      },
      {
        name: 'fooz',
        type: MVT_FIELD_TYPE.NUMBER,
      },
    ],
    tooltipProperties: ['foo', 'fooz'],
  };

  it('should get tooltipproperties', async () => {
    const source = new MVTSingleLayerVectorSource(descriptorWithFields);
    const tooltipProperties = await source.filterAndFormatPropertiesToHtml({
      foo: 'bar',
      fooz: 123,
    });
    expect(tooltipProperties.length).toEqual(2);
    expect(tooltipProperties[0].getPropertyName()).toEqual('foo');
    expect(tooltipProperties[0].getHtmlDisplayValue()).toEqual('bar');
    expect(tooltipProperties[1].getPropertyName()).toEqual('fooz');
    expect(tooltipProperties[1].getHtmlDisplayValue()).toEqual('123');
  });
});

describe('getImmutableSourceProperties', () => {
  it('should only show immutable props', async () => {
    const source = new MVTSingleLayerVectorSource(descriptor);
    const properties = await source.getImmutableProperties();
    expect(properties).toEqual([
      { label: 'Data source', value: '.pbf vector tiles' },
      { label: 'Url', value: 'https://example.com/{x}/{y}/{z}.pbf' },
    ]);
  });
});
