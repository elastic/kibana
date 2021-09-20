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
} from '../../../../common/utils/markdown_plugins/utils';

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

  const uniqRefs = uniqWith(
    flattenRefs,
    (refA, refB) => refA.type === refB.type && refA.id === refB.id && refA.name === refB.name
  );

  return uniqRefs;
};

export const getOrUpdateLensReferences = (
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'],
  newComment: string,
  currentComment?: SavedObject<CommentRequestUserType>
) => {
  const savedObjectReferences = currentComment?.references;
  const savedObjectLensReferences = extractLensReferencesFromCommentString(
    lensEmbeddableFactory,
    currentComment?.attributes.comment
  );

  const currentNonLensReferences = xorWith(
    savedObjectReferences,
    savedObjectLensReferences,
    (refA, refB) => refA.type === refB.type && refA.id === refB.id
  );

  const newCommentLensReferences = extractLensReferencesFromCommentString(
    lensEmbeddableFactory,
    newComment
  );

  return currentNonLensReferences.concat(newCommentLensReferences);
};

/**
 * TODO: split this up into a class for lens and timeline
 *
 * A class can implement an interface that
 * defines a method extractReferences
 *
 * Then have a function that does:
 *
 * oldRefs = extractReferences(oldSavedObject)
 *
 * refsNotIncludingType = xor(oldSavedObject.refs, oldRefs)
 *
 * newRefs = extractReferences(newComment)
 *
 * Do that for both lens and timeline, then add newRefs together and return it
 *
 */
