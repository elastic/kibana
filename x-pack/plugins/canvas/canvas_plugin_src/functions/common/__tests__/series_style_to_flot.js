/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { seriesStyleToFlot } from '../plot/series_style_to_flot';

describe('seriesStyleToFlot', () => {
  it('returns an empty object if seriesStyle is not provided', () => {
    expect(seriesStyleToFlot(null)).to.be.empty();
  });

  const testSeriesStyle = {
    type: 'seriesStyle',
    label: null,
    color: null,
    lines: 0,
    bars: 0,
    points: 0,
    fill: false,
    stack: undefined,
    horizontalBars: false,
  };

  describe('seriesStyle properties', () => {
    describe('color', () => {
      const seriesStyle = { ...testSeriesStyle, color: 'blue' };
      const result = seriesStyleToFlot(seriesStyle);
      it('sets fillColor for lines', () => {
        expect(result.lines).to.have.property('fillColor', 'blue');
      });

      it('sets color', () => {
        expect(result).to.have.property('color', 'blue');
      });
    });

    describe('lines', () => {
      describe('sets show', () => {
        it('hides line graphs when line width <= 0', () => {
          const seriesStyle = { ...testSeriesStyle };
          expect(seriesStyleToFlot(seriesStyle).lines).to.have.property('show', false);
        });

        it('shows line graphs when line width > 0', () => {
          const seriesStyle = { ...testSeriesStyle, lines: 1 };
          expect(seriesStyleToFlot(seriesStyle).lines).to.have.property('show', true);
        });
      });

      describe('sets lineWidth', () => {
        it('sets the line width', () => {
          const seriesStyle = { ...testSeriesStyle };
          let result = seriesStyleToFlot(seriesStyle);
          expect(result.lines).to.have.property('lineWidth', 0);

          seriesStyle.lines = 1;
          result = seriesStyleToFlot(seriesStyle);
          expect(result.lines).to.have.property('lineWidth', 1);

          seriesStyle.lines = 10;
          result = seriesStyleToFlot(seriesStyle);
          expect(result.lines).to.have.property('lineWidth', 10);
        });
      });
    });

    describe('bars', () => {
      describe('sets show', () => {
        it('hides bar graphs when bar width <= 0', () => {
          const seriesStyle = { ...testSeriesStyle };
          expect(seriesStyleToFlot(seriesStyle).bars).to.have.property('show', false);
        });

        it('shows bar graphs when bar width > 0', () => {
          const seriesStyle = { ...testSeriesStyle, bars: 1 };
          expect(seriesStyleToFlot(seriesStyle).bars).to.have.property('show', true);
        });
      });

      describe('sets barWidth', () => {
        it('sets the bar width', () => {
          const seriesStyle = { ...testSeriesStyle };
          let result = seriesStyleToFlot(seriesStyle);
          expect(result.bars).to.have.property('barWidth', 0);

          seriesStyle.bars = 1;
          result = seriesStyleToFlot(seriesStyle);
          expect(result.bars).to.have.property('barWidth', 1);

          seriesStyle.bars = 10;
          result = seriesStyleToFlot(seriesStyle);
          expect(result.bars).to.have.property('barWidth', 10);
        });
      });
    });

    describe('fill', () => {
      it('sets opacity of fill for line graphs', () => {
        const seriesStyle = { ...testSeriesStyle, fill: 10 };
        let result = seriesStyleToFlot(seriesStyle);
        expect(result.lines).to.have.property('fill', 1);

        seriesStyle.fill = 5;
        result = seriesStyleToFlot(seriesStyle);
        expect(result.lines).to.have.property('fill', 0.5);
      });

      it('sets fill of bubbles', () => {
        const seriesStyle = { ...testSeriesStyle, fill: 10 };
        let result = seriesStyleToFlot(seriesStyle);
        expect(result.bubbles).to.have.property('fill', 10);

        seriesStyle.fill = 5;
        result = seriesStyleToFlot(seriesStyle);
        expect(result.bubbles).to.have.property('fill', 5);
      });
    });

    describe('stack', () => {
      it('sets stack', () => {
        const seriesStyle = { ...testSeriesStyle, stack: 1 };
        let result = seriesStyleToFlot(seriesStyle);
        expect(result).to.have.property('stack', 1);

        seriesStyle.stack = 5;
        result = seriesStyleToFlot(seriesStyle);
        expect(result).to.have.property('stack', 5);
      });
    });

    describe('horizontalBars', () => {
      it('sets the orientation of the bar graph', () => {
        const seriesStyle = { ...testSeriesStyle };
        let result = seriesStyleToFlot(seriesStyle);
        expect(result.bars).to.have.property('horizontal', false);

        seriesStyle.horizontalBars = true;
        result = seriesStyleToFlot(seriesStyle);
        expect(result.bars).to.have.property('horizontal', true);
      });
    });
  });
});
