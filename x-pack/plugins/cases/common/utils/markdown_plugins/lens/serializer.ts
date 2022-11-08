/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin } from 'unified';
import type { TimeRange } from 'src/plugins/data/common';
import { LENS_ID } from './constants';

export interface LensSerializerProps {
  attributes: Record<string, unknown>;
  timeRange: TimeRange;
}

const serializeLens = ({ timeRange, attributes }: LensSerializerProps) =>
  `!{${LENS_ID}${JSON.stringify({
    timeRange,
    attributes,
  })}}`;

export const LensSerializer: Plugin = function () {
  const Compiler = this.Compiler;
  Compiler.prototype.visitors.lens = serializeLens;
};
