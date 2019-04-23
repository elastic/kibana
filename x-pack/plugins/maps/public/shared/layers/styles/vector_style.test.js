/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorStyle } from './vector_style';

describe('getDescriptorWithMissingStylePropsRemoved', () => {
  const fieldName = 'doIStillExist';
  const properties = {
    fillColor: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {}
    },
    lineColor: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {}
    },
    iconSize: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {
        color: 'a color',
        field: { name: fieldName }
      }
    }
  };

  it('Should return no changes when next oridinal fields contain existing style property fields', () => {
    const vectorStyle = new VectorStyle({ properties });

    const nextOridinalFields = [
      { name: fieldName }
    ];
    const { hasChanges } = vectorStyle.getDescriptorWithMissingStylePropsRemoved(nextOridinalFields);
    expect(hasChanges).toBe(false);
  });

  it('Should clear missing fields when next oridinal fields do not contain existing style property fields', () => {
    const vectorStyle = new VectorStyle({ properties });

    const nextOridinalFields = [];
    const { hasChanges, nextStyleDescriptor } = vectorStyle.getDescriptorWithMissingStylePropsRemoved(nextOridinalFields);
    expect(hasChanges).toBe(true);
    expect(nextStyleDescriptor.properties).toEqual({
      fillColor: {
        options: {},
        type: 'STATIC',
      },
      iconSize: {
        options: {
          color: 'a color',
        },
        type: 'DYNAMIC',
      },
      lineColor: {
        options: {},
        type: 'DYNAMIC',
      },
      lineWidth: {
        options: {
          size: 1,
        },
        type: 'STATIC',
      },
    });
  });
});

describe('getDescriptorWithDynamicRanges', () => {
  const dataRequests = [
    {
      data: {
        type: 'FeatureCollection',
        features: [
          {
            properties: {
              myDynamicField: 1
            }
          },
          {
            properties: {
              myDynamicField: 10
            }
          }
        ],
      }
    }
  ];

  it('Should not have changes when there are no dynamic properties', () => {
    const vectorStyle = new VectorStyle({
      properties: {
        fillColor: {
          type: VectorStyle.STYLE_TYPE.STATIC,
          options: {}
        }
      }
    });

    const { hasChanges } = vectorStyle.getDescriptorWithDynamicRanges(dataRequests);
    expect(hasChanges).toBe(false);
  });

  it('Should not have changes when no valid range found for dynamic property', () => {
    const vectorStyle = new VectorStyle({
      properties: {
        fillColor: {
          type: VectorStyle.STYLE_TYPE.DYNAMIC,
          options: {
            field: {
              name: 'myDynamicFieldWithNoValues'
            }
          }
        }
      }
    });

    const { hasChanges } = vectorStyle.getDescriptorWithDynamicRanges(dataRequests);
    expect(hasChanges).toBe(false);
  });

  it('Should not have changes when no range is identical to previous range for dynamic property', () => {
    const vectorStyle = new VectorStyle({
      properties: {
        fillColor: {
          type: VectorStyle.STYLE_TYPE.DYNAMIC,
          options: {
            field: {
              name: 'myDynamicField'
            }
          },
          __range: {
            min: 1,
            max: 10
          }
        }
      }
    });

    const { hasChanges } = vectorStyle.getDescriptorWithDynamicRanges(dataRequests);
    expect(hasChanges).toBe(false);
  });

  it('Should add range to style descriptor for dynamic property', () => {
    const vectorStyle = new VectorStyle({
      properties: {
        fillColor: {
          type: VectorStyle.STYLE_TYPE.DYNAMIC,
          options: {
            field: {
              name: 'myDynamicField'
            }
          }
        }
      }
    });

    const { hasChanges, nextStyleDescriptor } = vectorStyle.getDescriptorWithDynamicRanges(dataRequests);
    expect(hasChanges).toBe(true);
    expect(nextStyleDescriptor.properties.fillColor.__range).toEqual({
      max: 10,
      min: 1
    });
  });
});
