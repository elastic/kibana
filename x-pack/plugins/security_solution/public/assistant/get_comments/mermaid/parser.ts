/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import visit from 'unist-util-visit';
import type { Plugin } from 'unified';

export const MermaidParser: Plugin = () => {
  return (ast) => visit(ast, 'code', visitor);

  function visitor(node: { lang: string; value: string; type: string; chart: string }) {
    const { lang: language } = node;

    if (language !== 'mermaid') {
      return;
    }

    node.type = 'mermaid';
    node.chart = node.value;
  }
};
