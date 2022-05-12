/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin } from 'unified';
export interface TimelineSerializerProps {
  match: string;
}

const serializeTimeline = ({ match }: TimelineSerializerProps) => match;

export const TimelineSerializer: Plugin = function () {
  const Compiler = this.Compiler;
  Compiler.prototype.visitors.timeline = serializeTimeline;
};
