/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node } from 'unist';
import type { Parent, Content, PhrasingContent } from 'mdast';
import { MARKDOWN_TYPES } from '@kbn/elastic-assistant/impl/assistant/use_conversation/helpers';

export const customCodeBlockLanguagePlugin = () => {
  const visitor = (node: Node, parent?: Parent) => {
    if ('children' in node) {
      const nodeAsParent = node as Parent;
      nodeAsParent.children.forEach((child) => {
        visitor(child, nodeAsParent);
      });
    }

    if (node.type === 'code' && !node.lang) {
      try {
        const index = parent?.children.indexOf(node as Content);

        if (index) {
          const previousText = (parent?.children[index - 1]?.children as PhrasingContent[])
            ?.map((child) => child.value)
            .join(' ');
          for (const [typeKey, keywords] of Object.entries(MARKDOWN_TYPES)) {
            if (keywords.some((kw) => previousText.toLowerCase().includes(kw.toLowerCase()))) {
              node.lang = typeKey;
              break;
            }
          }
        }
      } catch (e) {
        /* empty */
      }
    }

    if (node.type === 'code' && node.lang === 'esql') {
      node.type = 'esql';
      return;
    }

    if (node.type === 'code' && ['eql', 'kql', 'dsl', 'json'].includes(node.lang as string)) {
      node.type = 'customCodeBlock';
    }
  };

  return (tree: Node) => {
    visitor(tree);
  };
};
