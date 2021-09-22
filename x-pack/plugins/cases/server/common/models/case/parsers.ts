/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: remove this
/* eslint-disable max-classes-per-file */

import { SavedObject, SavedObjectReference } from 'kibana/server';
import { flatMap, uniqWith, xorWith } from 'lodash';
import { CommentRequestUserType } from '../../../../common';
import { LensServerPluginSetup } from '../../../../../lens/server';

import {
  parseCommentString,
  getLensVisualizations,
} from '../../../../common/utils/markdown_plugins/utils';
import { TIMELINE_ID } from '../../../../common/utils/markdown_plugins/timeline';

interface ReferenceExtractor {
  extractReferences(stringToParse?: string): SavedObjectReference[];
}

class LensReferenceExtractor implements ReferenceExtractor {
  constructor(
    private readonly lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory']
  ) {}

  extractReferences(markdownString?: string): SavedObjectReference[] {
    const extractor = this.lensEmbeddableFactory().extract;
    if (!extractor || !markdownString) {
      return [];
    }

    const parsedComment = parseCommentString(markdownString);
    const lensVisualizations = getLensVisualizations(parsedComment.children);
    const flattenRefs = flatMap(
      lensVisualizations,
      (lensObject) => extractor(lensObject)?.references ?? []
    );

    const uniqRefs = uniqWith(
      flattenRefs,
      (refA, refB) => refA.type === refB.type && refA.id === refB.id && refA.name === refB.name
    );

    return uniqRefs;
  }
}

export class TimelineReferenceExtractor implements ReferenceExtractor {
  extractReferences(markdownString?: string): SavedObjectReference[] {
    if (!markdownString) {
      return [];
    }

    const parsedComment = getTimelineNodes(markdownString);
    console.log(JSON.stringify(parsedComment, null, 2));
  }
}

function getTimelineNodes(markdownString: string) {
  const parsedComment = parseCommentString(markdownString);

  return parsedComment;
  // return parsedComment.children.filter((node) => node.type === TIMELINE_ID);
}
