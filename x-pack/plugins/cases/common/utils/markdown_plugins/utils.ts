/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-extraneous-dependencies */

import { filter } from 'lodash';
import type { Parent } from 'unist';
import markdown from 'remark-parse';
import remarkStringify from 'remark-stringify';
import unified from 'unified';

import { TimeRange } from 'src/plugins/data/server';
import { EmbeddableStateWithType } from 'src/plugins/embeddable/common';
import { LensEmbeddablePersistableState } from '../../../../lens/common/embeddable_factory';
import { LENS_ID, LensParser, LensSerializer } from './lens';
import { TimelineSerializer, TimelineParser } from './timeline';

interface LensMarkdownNode extends EmbeddableStateWithType {
  timeRange: TimeRange;
  attributes: LensEmbeddablePersistableState;
}

export const getLensVisualizations = (parsedComment: Array<LensMarkdownNode | Node>) =>
  filter(parsedComment, { type: LENS_ID }) as LensMarkdownNode[];

export const parseCommentString = (comment: string) => {
  const processor = unified().use([[markdown, {}], LensParser, TimelineParser]);
  // @ts-expect-error
  return processor.parse(comment) as Omit<Parent, 'children'> & {
    children: Array<LensMarkdownNode | Node>;
  };
};

export const stringifyComment = (comment: Parent) =>
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
