/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { seriesStyle } from '../seriesStyle';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('seriesStyle', () => {
  const fn = functionWrapper(seriesStyle);

  it('returns a seriesStyle', () => {
    const result = fn(null);
    expect(result).to.have.property('type', 'seriesStyle');
  });

  describe('args', () => {
    describe('label', () => {
      it('sets label to identify which series to style', () => {
        const result = fn(null, { label: 'kibana' });
        expect(result).to.have.property('label', 'kibana');
      });
    });

    describe('color', () => {
      it('sets color', () => {
        const result = fn(null, { color: 'purple' });
        expect(result).to.have.property('color', 'purple');
      });
    });

    describe('lines', () => {
      it('sets line width', () => {
        const result = fn(null, { lines: 1 });
        expect(result).to.have.property('lines', 1);
      });
    });

    describe('bars', () => {
      it('sets bar width', () => {
        const result = fn(null, { bars: 3 });
        expect(result).to.have.property('bars', 3);
      });
    });

    describe('points', () => {
      it('sets point size', () => {
        const result = fn(null, { points: 2 });
        expect(result).to.have.property('points', 2);
      });
    });

    describe('fill', () => {
      it('sets if series is filled', () => {
        let result = fn(null, { fill: true });
        expect(result).to.have.property('fill', true);

        result = fn(null, { fill: false });
        expect(result).to.have.property('fill', false);
      });
    });

    describe('stack', () => {
      it('sets stack id to stack multiple series with a shared id', () => {
        const result = fn(null, { stack: 1 });
        expect(result).to.have.property('stack', 1);
      });
    });

    describe('horizontalBars', () => {
      it('sets orientation of the series to horizontal', () => {
        const result = fn(null, { horizontalBars: true });
        expect(result).to.have.property('horizontalBars', true);
      });
      it('sets orientation of the series to vertical', () => {
        const result = fn(null, { horizontalBars: false });
        expect(result).to.have.property('horizontalBars', false);
      });
    });
  });
});
