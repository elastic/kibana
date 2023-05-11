/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin } from 'unified';
export interface MentionsSerializerProps {
  mention: string;
}

const serializeMentions = ({ mention }: MentionsSerializerProps) => mention;

export const MentionsSerializer: Plugin = function () {
  const Compiler = this.Compiler;
  Compiler.prototype.visitors.mentions = serializeMentions;
};
