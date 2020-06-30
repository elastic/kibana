/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import * as plotUtils from './plotUtils';
import { TimeSeries, Coordinate } from '../../../../../typings/timeseries';

describe('plotUtils', () => {
  describe('getPlotValues', () => {
    describe('with empty arguments', () => {
      it('returns plotvalues', () => {
        expect(
          plotUtils.getPlotValues([], [], { height: 1, width: 1 })
        ).toMatchObject({
          XY_HEIGHT: 1,
          XY_WIDTH: 1,
        });
      });
    });

    describe('when yMin is given', () => {
      it('uses the yMin in the scale', () => {
        expect(
          plotUtils
            .getPlotValues([], [], { height: 1, width: 1, yMin: 100 })
            .y.domain()[0]
        ).toEqual(100);
      });

      describe('when yMin is "min"', () => {
        it('uses minimum y from the series', () => {
          expect(
            plotUtils
              .getPlotValues(
                [
                  { data: [{ x: 0, y: 200 }] },
                  { data: [{ x: 0, y: 300 }] },
                ] as Array<TimeSeries<Coordinate>>,
                [],
                {
                  height: 1,
                  width: 1,
                  yMin: 'min',
                }
              )
              .y.domain()[0]
          ).toEqual(200);
        });
      });
    });

    describe('when yMax given', () => {
      it('uses yMax', () => {
        expect(
          plotUtils
            .getPlotValues([], [], {
              height: 1,
              width: 1,
              yMax: 500,
            })
            .y.domain()[1]
        ).toEqual(500);
      });
    });
  });
});
