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

import { TimeRange } from 'src/plugins/data/server';
import { SerializableRecord } from '@kbn/utility-types';
import { LENS_ID, LensParser, LensSerializer } from './lens';
import { TimelineSerializer, TimelineParser } from './timeline';

interface LensMarkdownNode extends Node {
  timeRange: TimeRange;
  attributes: SerializableRecord;
  type: string;
  id: string;
}

interface LensMarkdownParent extends Node {
  children: Array<LensMarkdownNode | Node>;
}

export const getLensVisualizations = (parsedComment?: Array<LensMarkdownNode | Node>) =>
  (parsedComment?.length ? filter(parsedComment, { type: LENS_ID }) : []) as LensMarkdownNode[];

export const parseCommentString = (comment: string) => {
  const processor = unified().use([[markdown, {}], LensParser, TimelineParser]);
  return processor.parse(comment) as LensMarkdownParent;
};

export const stringifyComment = (comment: LensMarkdownParent) =>
  unified()
    .use([
      [
        remarkStringify,
        {
          allowDangerousHtml: true,
          handlers: {
            /*
              because we're using rison in the timeline url we need
              to make sure that markdown parser doesn't modify the url
            */
            timeline: TimelineSerializer,
            lens: LensSerializer,
          },
        },
      ],
    ])
    .stringify(comment);
