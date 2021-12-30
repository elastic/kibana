/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter } from 'lodash';
import type { Node } from 'unist';
import markdown from 'remark-parse';
import remarkStringify from 'remark-stringify';
import unified from 'unified';

import { SerializableRecord } from '@kbn/utility-types';
import type { TimeRange } from 'src/plugins/data/common';
import { LENS_ID, LensParser, LensSerializer } from './lens';
import { TimelineSerializer, TimelineParser } from './timeline';

export interface LensMarkdownNode extends Node {
  timeRange: TimeRange;
  attributes: SerializableRecord;
  type: string;
  id: string;
}

/**
 * A node that has children of other nodes describing the markdown elements or a specific lens visualization.
 */
export interface MarkdownNode extends Node {
  children: Array<LensMarkdownNode | Node>;
}

export const getLensVisualizations = (parsedComment?: Array<LensMarkdownNode | Node>) =>
  (parsedComment?.length ? filter(parsedComment, { type: LENS_ID }) : []) as LensMarkdownNode[];

/**
 * Converts a text comment into a series of markdown nodes that represent a lens visualization, a timeline link, or just
 * plain markdown.
 */
export const parseCommentString = (comment: string) => {
  const processor = unified().use([[markdown, {}], LensParser, TimelineParser]);
  return processor.parse(comment) as MarkdownNode;
};

export const stringifyMarkdownComment = (comment: MarkdownNode) =>
  unified()
    .use([
      [remarkStringify],
      /*
        because we're using rison in the timeline url we need
        to make sure that markdown parser doesn't modify the url
      */
      LensSerializer,
      TimelineSerializer,
    ])
    .stringify(comment);

export const isLensMarkdownNode = (node?: unknown): node is LensMarkdownNode => {
  const unsafeNode = node as LensMarkdownNode;
  return (
    unsafeNode != null &&
    unsafeNode.timeRange != null &&
    unsafeNode.attributes != null &&
    unsafeNode.type === 'lens'
  );
};
