/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import {
  EMSTMSSource,
} from './ems_tms_source';

describe('EMSTMSSource', () => {

  it('should get attribution from markdown (tiles v2 legacy format)', async () => {

    const emsTmsSource = new EMSTMSSource({
      id: 'road_map'
    }, {
      emsTmsServices: [
        {
          id: 'road_map',
          attributionMarkdown: '[foobar](http://foobar.org)  | [foobaz](http://foobaz.org)'
        }, {
          id: 'satellite',
          attributionMarkdown: '[satellite](http://satellite.org)'
        }
      ]
    });


    const attributions = await emsTmsSource.getAttributions();

    expect(attributions).toEqual([
      {
        label: 'foobar',
        url: 'http://foobar.org'
      }, {
        label: 'foobaz',
        url: 'http://foobaz.org'
      }
    ]);
  });

});
