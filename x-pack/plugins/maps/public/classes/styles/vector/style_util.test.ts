/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isOnlySingleFeatureType, assignCategoriesToIcons, dynamicRound } from './style_util';
import { VECTOR_SHAPE_TYPE } from '../../../../common/constants';

describe('isOnlySingleFeatureType', () => {
  describe('source supports single feature type', () => {
    const supportedFeatures = [VECTOR_SHAPE_TYPE.POINT];
    const hasFeatureType = {
      [VECTOR_SHAPE_TYPE.POINT]: false,
      [VECTOR_SHAPE_TYPE.LINE]: false,
      [VECTOR_SHAPE_TYPE.POLYGON]: false,
    };

    test('Is only single feature type when only supported feature type is target feature type', () => {
      expect(
        isOnlySingleFeatureType(VECTOR_SHAPE_TYPE.POINT, supportedFeatures, hasFeatureType)
      ).toBe(true);
    });

    test('Is not single feature type when only supported feature type is not target feature type', () => {
      expect(
        isOnlySingleFeatureType(VECTOR_SHAPE_TYPE.LINE, supportedFeatures, hasFeatureType)
      ).toBe(false);
    });
  });

  describe('source supports multiple feature types', () => {
    const supportedFeatures = [
      VECTOR_SHAPE_TYPE.POINT,
      VECTOR_SHAPE_TYPE.LINE,
      VECTOR_SHAPE_TYPE.POLYGON,
    ];

    test('Is only single feature type when data only has target feature type', () => {
      const hasFeatureType = {
        [VECTOR_SHAPE_TYPE.POINT]: true,
        [VECTOR_SHAPE_TYPE.LINE]: false,
        [VECTOR_SHAPE_TYPE.POLYGON]: false,
      };
      expect(
        isOnlySingleFeatureType(VECTOR_SHAPE_TYPE.POINT, supportedFeatures, hasFeatureType)
      ).toBe(true);
    });

    test('Is not single feature type when data has multiple feature types', () => {
      const hasFeatureType = {
        [VECTOR_SHAPE_TYPE.POINT]: true,
        [VECTOR_SHAPE_TYPE.LINE]: true,
        [VECTOR_SHAPE_TYPE.POLYGON]: true,
      };
      expect(
        isOnlySingleFeatureType(VECTOR_SHAPE_TYPE.LINE, supportedFeatures, hasFeatureType)
      ).toBe(false);
    });

    test('Is not single feature type when data does not have target feature types', () => {
      const hasFeatureType = {
        [VECTOR_SHAPE_TYPE.POINT]: false,
        [VECTOR_SHAPE_TYPE.LINE]: true,
        [VECTOR_SHAPE_TYPE.POLYGON]: false,
      };
      expect(
        isOnlySingleFeatureType(VECTOR_SHAPE_TYPE.POINT, supportedFeatures, hasFeatureType)
      ).toBe(false);
    });
  });
});

describe('assignCategoriesToIcons', () => {
  test('Categories and icons have same length', () => {
    const categories = [
      { key: 'alpah', count: 1 },
      { key: 'bravo', count: 1 },
      { key: 'charlie', count: 1 },
      { key: 'delta', count: 1 },
    ];
    const icons = [
      {
        value: 'circle',
        label: 'circle',
        svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="circle-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path d="M14,7.5c0,3.5899-2.9101,6.5-6.5,6.5S1,11.0899,1,7.5S3.9101,1,7.5,1S14,3.9101,14,7.5z"/>\n</svg>',
      },
      {
        value: 'marker',
        label: 'marker',
        svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="marker-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path id="path4133" d="M7.5,0C5.0676,0,2.2297,1.4865,2.2297,5.2703&#xA;&#x9;C2.2297,7.8378,6.2838,13.5135,7.5,15c1.0811-1.4865,5.2703-7.027,5.2703-9.7297C12.7703,1.4865,9.9324,0,7.5,0z"/>\n</svg>',
      },
      {
        value: 'triangle',
        label: 'triangle',
        svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="triangle-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path id="path21090-9" d="M7.5385,2&#xA;&#x9;C7.2437,2,7.0502,2.1772,6.9231,2.3846l-5.8462,9.5385C1,12,1,12.1538,1,12.3077C1,12.8462,1.3846,13,1.6923,13h11.6154&#xA;&#x9;C13.6923,13,14,12.8462,14,12.3077c0-0.1538,0-0.2308-0.0769-0.3846L8.1538,2.3846C8.028,2.1765,7.7882,2,7.5385,2z"/>\n</svg>',
      },
      {
        value: 'square',
        label: 'square',
        svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="square-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path d="M13,14H2c-0.5523,0-1-0.4477-1-1V2c0-0.5523,0.4477-1,1-1h11c0.5523,0,1,0.4477,1,1v11C14,13.5523,13.5523,14,13,14z"/>\n</svg>',
      },
    ];
    expect(assignCategoriesToIcons({ categories, icons })).toEqual({
      stops: [
        {
          stop: 'alpah',
          value: 'circle',
          label: 'circle',
          svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="circle-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path d="M14,7.5c0,3.5899-2.9101,6.5-6.5,6.5S1,11.0899,1,7.5S3.9101,1,7.5,1S14,3.9101,14,7.5z"/>\n</svg>',
        },
        {
          stop: 'bravo',
          value: 'marker',
          label: 'marker',
          svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="marker-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path id="path4133" d="M7.5,0C5.0676,0,2.2297,1.4865,2.2297,5.2703&#xA;&#x9;C2.2297,7.8378,6.2838,13.5135,7.5,15c1.0811-1.4865,5.2703-7.027,5.2703-9.7297C12.7703,1.4865,9.9324,0,7.5,0z"/>\n</svg>',
        },
        {
          stop: 'charlie',
          value: 'triangle',
          label: 'triangle',
          svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="triangle-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path id="path21090-9" d="M7.5385,2&#xA;&#x9;C7.2437,2,7.0502,2.1772,6.9231,2.3846l-5.8462,9.5385C1,12,1,12.1538,1,12.3077C1,12.8462,1.3846,13,1.6923,13h11.6154&#xA;&#x9;C13.6923,13,14,12.8462,14,12.3077c0-0.1538,0-0.2308-0.0769-0.3846L8.1538,2.3846C8.028,2.1765,7.7882,2,7.5385,2z"/>\n</svg>',
        },
      ],
      fallbackSymbol: {
        value: 'square',
        label: 'square',
        svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="square-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path d="M13,14H2c-0.5523,0-1-0.4477-1-1V2c0-0.5523,0.4477-1,1-1h11c0.5523,0,1,0.4477,1,1v11C14,13.5523,13.5523,14,13,14z"/>\n</svg>',
        stop: null,
      },
    });
  });

  test('Should More categories than icon values', () => {
    const categories = [
      { key: 'alpah', count: 1 },
      { key: 'bravo', count: 1 },
      { key: 'charlie', count: 1 },
      { key: 'delta', count: 1 },
    ];
    const icons = [
      {
        value: 'circle',
        label: 'circle',
        svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="circle-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path d="M14,7.5c0,3.5899-2.9101,6.5-6.5,6.5S1,11.0899,1,7.5S3.9101,1,7.5,1S14,3.9101,14,7.5z"/>\n</svg>',
      },
      {
        value: 'square',
        label: 'square',
        svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="square-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path d="M13,14H2c-0.5523,0-1-0.4477-1-1V2c0-0.5523,0.4477-1,1-1h11c0.5523,0,1,0.4477,1,1v11C14,13.5523,13.5523,14,13,14z"/>\n</svg>',
      },
      {
        value: 'triangle',
        label: 'triangle',
        svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="triangle-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path id="path21090-9" d="M7.5385,2&#xA;&#x9;C7.2437,2,7.0502,2.1772,6.9231,2.3846l-5.8462,9.5385C1,12,1,12.1538,1,12.3077C1,12.8462,1.3846,13,1.6923,13h11.6154&#xA;&#x9;C13.6923,13,14,12.8462,14,12.3077c0-0.1538,0-0.2308-0.0769-0.3846L8.1538,2.3846C8.028,2.1765,7.7882,2,7.5385,2z"/>\n</svg>',
      },
    ];
    expect(assignCategoriesToIcons({ categories, icons })).toEqual({
      stops: [
        {
          stop: 'alpah',
          value: 'circle',
          label: 'circle',
          svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="circle-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path d="M14,7.5c0,3.5899-2.9101,6.5-6.5,6.5S1,11.0899,1,7.5S3.9101,1,7.5,1S14,3.9101,14,7.5z"/>\n</svg>',
        },
        {
          stop: 'bravo',
          value: 'square',
          label: 'square',
          svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="square-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path d="M13,14H2c-0.5523,0-1-0.4477-1-1V2c0-0.5523,0.4477-1,1-1h11c0.5523,0,1,0.4477,1,1v11C14,13.5523,13.5523,14,13,14z"/>\n</svg>',
        },
      ],
      fallbackSymbol: {
        stop: null,
        value: 'triangle',
        label: 'triangle',
        svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="triangle-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path id="path21090-9" d="M7.5385,2&#xA;&#x9;C7.2437,2,7.0502,2.1772,6.9231,2.3846l-5.8462,9.5385C1,12,1,12.1538,1,12.3077C1,12.8462,1.3846,13,1.6923,13h11.6154&#xA;&#x9;C13.6923,13,14,12.8462,14,12.3077c0-0.1538,0-0.2308-0.0769-0.3846L8.1538,2.3846C8.028,2.1765,7.7882,2,7.5385,2z"/>\n</svg>',
      },
    });
  });

  test('Less categories than icon values', () => {
    const categories = [
      { key: 'alpah', count: 1 },
      { key: 'bravo', count: 1 },
    ];
    const icons = [
      {
        value: 'circle',
        label: 'circle',
        svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="circle-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path d="M14,7.5c0,3.5899-2.9101,6.5-6.5,6.5S1,11.0899,1,7.5S3.9101,1,7.5,1S14,3.9101,14,7.5z"/>\n</svg>',
      },
      {
        value: 'triangle',
        label: 'triangle',
        svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="triangle-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path id="path21090-9" d="M7.5385,2&#xA;&#x9;C7.2437,2,7.0502,2.1772,6.9231,2.3846l-5.8462,9.5385C1,12,1,12.1538,1,12.3077C1,12.8462,1.3846,13,1.6923,13h11.6154&#xA;&#x9;C13.6923,13,14,12.8462,14,12.3077c0-0.1538,0-0.2308-0.0769-0.3846L8.1538,2.3846C8.028,2.1765,7.7882,2,7.5385,2z"/>\n</svg>',
      },
      {
        value: 'marker',
        label: 'marker',
        svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="marker-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path id="path4133" d="M7.5,0C5.0676,0,2.2297,1.4865,2.2297,5.2703&#xA;&#x9;C2.2297,7.8378,6.2838,13.5135,7.5,15c1.0811-1.4865,5.2703-7.027,5.2703-9.7297C12.7703,1.4865,9.9324,0,7.5,0z"/>\n</svg>',
      },
      {
        value: 'square',
        label: 'square',
        svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="square-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path d="M13,14H2c-0.5523,0-1-0.4477-1-1V2c0-0.5523,0.4477-1,1-1h11c0.5523,0,1,0.4477,1,1v11C14,13.5523,13.5523,14,13,14z"/>\n</svg>',
      },
      {
        value: 'rectangle',
        label: 'rectangle',
        svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="rectangle-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path d="M13,14H2c-0.5523,0-1-0.4477-1-1V2c0-0.5523,0.4477-1,1-1h11c0.5523,0,1,0.4477,1,1v11C14,13.5523,13.5523,14,13,14z"/>\n</svg>',
      },
    ];
    expect(assignCategoriesToIcons({ categories, icons })).toEqual({
      stops: [
        {
          stop: 'alpah',
          value: 'circle',
          label: 'circle',
          svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="circle-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path d="M14,7.5c0,3.5899-2.9101,6.5-6.5,6.5S1,11.0899,1,7.5S3.9101,1,7.5,1S14,3.9101,14,7.5z"/>\n</svg>',
        },
        {
          stop: 'bravo',
          value: 'triangle',
          label: 'triangle',
          svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="triangle-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path id="path21090-9" d="M7.5385,2&#xA;&#x9;C7.2437,2,7.0502,2.1772,6.9231,2.3846l-5.8462,9.5385C1,12,1,12.1538,1,12.3077C1,12.8462,1.3846,13,1.6923,13h11.6154&#xA;&#x9;C13.6923,13,14,12.8462,14,12.3077c0-0.1538,0-0.2308-0.0769-0.3846L8.1538,2.3846C8.028,2.1765,7.7882,2,7.5385,2z"/>\n</svg>',
        },
      ],
      fallbackSymbol: {
        stop: null,
        value: 'marker',
        label: 'marker',
        svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="marker-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path id="path4133" d="M7.5,0C5.0676,0,2.2297,1.4865,2.2297,5.2703&#xA;&#x9;C2.2297,7.8378,6.2838,13.5135,7.5,15c1.0811-1.4865,5.2703-7.027,5.2703-9.7297C12.7703,1.4865,9.9324,0,7.5,0z"/>\n</svg>',
      },
    });
  });
});

describe('dynamicRound', () => {
  test('Should truncate based on magnitude of number', () => {
    expect(dynamicRound(1000.1234)).toBe(1000);
    expect(dynamicRound(1.1234)).toBe(1.12);
    expect(dynamicRound(0.0012345678)).toBe(0.00123);
  });

  test('Should return argument when not a number', () => {
    expect(dynamicRound('foobar')).toBe('foobar');
  });
});
