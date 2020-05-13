/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line max-classes-per-file
import { FIELD_ORIGIN } from '../../../../../common/constants';
import { StyleMeta } from '../style_meta';

export const mockField = {
  async getLabel() {
    return 'foobar_label';
  },
  getName() {
    return 'foobar';
  },
  getRootName() {
    return 'foobar';
  },
  getOrigin() {
    return FIELD_ORIGIN.SOURCE;
  },
  supportsFieldMeta() {
    return true;
  },
};

class MockStyle {
  getStyleMeta() {
    return new StyleMeta({
      geometryTypes: {
        isPointsOnly: false,
        isLinesOnly: false,
        isPolygonsOnly: false,
      },
      fieldMeta: {
        foobar: {
          range: { min: 0, max: 100 },
          categories: {
            categories: [
              {
                key: 'US',
                count: 10,
              },
              {
                key: 'CN',
                count: 8,
              },
            ],
          },
        },
      },
    });
  }
}

export class MockLayer {
  getStyle() {
    return new MockStyle();
  }

  getDataRequest() {
    return null;
  }
}
