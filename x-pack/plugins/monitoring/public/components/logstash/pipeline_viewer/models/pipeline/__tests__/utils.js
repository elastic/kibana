/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { isVertexPipelineStage } from '../utils';

describe('Utils', () => {
  let vertex;
  let pipelineStage;

  beforeEach(() => {
    pipelineStage = 'input';
  });

  describe('vertex is undefined', () => {
    it('isVertexPipelineStage returns undefined', () => {
      vertex = undefined;
      const actual = isVertexPipelineStage(vertex, pipelineStage);

      expect(actual).to.be(undefined);
    });
  });

  describe('vertex is null', () => {
    it('isVertexPipelineStage returns null', () => {
      vertex = null;
      const actual = isVertexPipelineStage(vertex, pipelineStage);

      expect(actual).to.be(null);
    });
  });

  describe('vertex has no pipeline stage', () => {
    it('isVertexPipelineStage returns false', () => {
      vertex = {};
      const actual = isVertexPipelineStage(vertex, pipelineStage);

      expect(actual).to.be(false);
    });
  });

  describe('pipeline stage is falsy', () => {
    it('isVertexPipelineStage returns false for undefined pipelineStage', () => {
      vertex = { pipelineStage: 'input' };
      pipelineStage = undefined;
      const actual = isVertexPipelineStage(vertex, pipelineStage);

      expect(actual).to.be(false);
    });

    it('isVertexPipelineStage returns false for null pipelineStage', () => {
      vertex = { pipelineStage: 'input' };
      pipelineStage = null;
      const actual = isVertexPipelineStage(vertex, pipelineStage);

      expect(actual).to.be(false);
    });
  });

  describe('vertex pipeline stage matches', () => {
    it('isVertexPipelineStage returns true', () => {
      vertex = { pipelineStage: 'input' };
      const actual = isVertexPipelineStage(vertex, pipelineStage);

      expect(actual).to.be(true);
    });
  });
});
