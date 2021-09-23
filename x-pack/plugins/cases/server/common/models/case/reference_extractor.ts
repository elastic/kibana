/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectReference } from 'kibana/server';
import { flatMap, uniqWith, xorWith } from 'lodash';
import { CommentRequestUserType } from '../../../../common';
import { LensServerPluginSetup } from '../../../../../lens/server';

import {
  parseCommentString,
  getLensVisualizations,
  TimelineMarkdownNode,
  isTimelineMarkdownNode,
} from '../../../../common/utils/markdown_plugins/utils';

type Extractor = (stringToParse?: string) => SavedObjectReference[];

export class ReferencesExtractor {
  private readonly extractors: Extractor[];

  constructor(lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory']) {
    this.extractors = [
      createLensReferencesExtractor(lensEmbeddableFactory),
      extractTimelineReferenceFromString,
    ];
  }

  extractReferences(newComment: string, currentComment?: SavedObject<CommentRequestUserType>) {
    const nonLensTimelineReferences = this.getNonExtractorReferences(currentComment);

    const referencesToReturn = [...nonLensTimelineReferences];
    for (const extractor of this.extractors) {
      referencesToReturn.push(...extractor(newComment));
    }

    return referencesToReturn;
  }

  private getNonExtractorReferences(commentSavedObject?: SavedObject<CommentRequestUserType>) {
    let currentReferences = commentSavedObject?.references ?? [];

    for (const extractor of this.extractors) {
      const extractedReferences = extractor(commentSavedObject?.attributes.comment);

      currentReferences = removeExtractedReferences(currentReferences, extractedReferences);
    }

    return currentReferences;
  }
}

const createLensReferencesExtractor = (
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory']
): Extractor => {
  return (comment?: string) =>
    extractLensReferencesFromCommentString(lensEmbeddableFactory, comment);
};

export const extractLensReferencesFromCommentString = (
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'],
  comment?: string
): SavedObjectReference[] => {
  const extract = lensEmbeddableFactory()?.extract;

  if (!extract || !comment) {
    return [];
  }

  const parsedComment = parseCommentString(comment);
  const lensVisualizations = getLensVisualizations(parsedComment.children);
  const flattenRefs = flatMap(
    lensVisualizations,
    (lensObject) => extract(lensObject)?.references ?? []
  );

  return dedupReferences(flattenRefs);
};

const dedupReferences = (references: SavedObjectReference[]): SavedObjectReference[] =>
  uniqWith(references, referenceComparator);

const referenceComparator = (refA: SavedObjectReference, refB: SavedObjectReference) =>
  refA.type === refB.type && refA.id === refB.id && refA.name === refB.name;

export const extractTimelineReferenceFromString: Extractor = (
  comment?: string
): SavedObjectReference[] => {
  if (!comment) {
    return [];
  }

  const parsedComment = getTimelineNodes(comment);

  // TODO: use a const for type
  const allReferences = parsedComment.map(({ id, title }) => ({
    id,
    name: title,
    type: 'siem-ui-timeline',
  }));

  return dedupReferences(allReferences);
};

const getTimelineNodes = (markdownString: string): TimelineMarkdownNode[] => {
  const parsedComment = parseCommentString(markdownString);

  return parsedComment.children.filter((node): node is TimelineMarkdownNode =>
    isTimelineMarkdownNode(node)
  );
};

const removeExtractedReferences = (
  references: SavedObjectReference[] | undefined,
  extractedReferences: SavedObjectReference[]
): SavedObjectReference[] => xorWith(references, extractedReferences, referenceComparator);
