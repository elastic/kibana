/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues, trimEnd, mergeWith } from 'lodash';
import type { SerializableRecord } from '@kbn/utility-types';
import {
  MigrateFunction,
  MigrateFunctionsObject,
} from '../../../../../../src/plugins/kibana_utils/common';
import {
  SavedObjectUnsanitizedDoc,
  SavedObjectSanitizedDoc,
  SavedObjectMigrationFn,
  SavedObjectMigrationMap,
  SavedObjectMigrationContext,
} from '../../../../../../src/core/server';
import { LensServerPluginSetup } from '../../../../lens/server';
import {
  CommentType,
  AssociationType,
  AttributesTypeAlerts,
  AttributesTypeAlertsRt,
} from '../../../common/api';
import {
  isLensMarkdownNode,
  LensMarkdownNode,
  MarkdownNode,
  parseCommentString,
  stringifyMarkdownComment,
} from '../../../common/utils/markdown_plugins/utils';
import { addOwnerToSO, SanitizedCaseOwner } from '.';
import { logError } from './utils';
import { getIDsAndIndicesAsArrays } from '../../common/utils';

interface UnsanitizedComment {
  comment: string;
  type?: CommentType;
}

interface SanitizedComment {
  comment: string;
  type: CommentType;
}

interface SanitizedCommentForSubCases {
  associationType: AssociationType;
  rule?: { id: string | null; name: string | null };
}

type SeparatedAlertFields = Partial<AttributesTypeAlerts>;

export interface CreateCommentsMigrationsDeps {
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
}

export const createCommentsMigrations = (
  migrationDeps: CreateCommentsMigrationsDeps
): SavedObjectMigrationMap => {
  const commentsMigrations = {
    '7.11.0': (
      doc: SavedObjectUnsanitizedDoc<UnsanitizedComment>
    ): SavedObjectSanitizedDoc<SanitizedComment> => {
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          type: CommentType.user,
        },
        references: doc.references || [],
      };
    },
    '7.12.0': (
      doc: SavedObjectUnsanitizedDoc<UnsanitizedComment>
    ): SavedObjectSanitizedDoc<SanitizedCommentForSubCases> => {
      let attributes: SanitizedCommentForSubCases & UnsanitizedComment = {
        ...doc.attributes,
        associationType: AssociationType.case,
      };

      // only add the rule object for alert comments. Prior to 7.12 we only had CommentType.alert, generated alerts are
      // introduced in 7.12.
      if (doc.attributes.type === CommentType.alert) {
        attributes = { ...attributes, rule: { id: null, name: null } };
      }

      return {
        ...doc,
        attributes,
        references: doc.references || [],
      };
    },
    '7.14.0': (
      doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>
    ): SavedObjectSanitizedDoc<SanitizedCaseOwner> => {
      return addOwnerToSO(doc);
    },
    '8.1.0': migrateAlertsToObjects810,
  };

  const embeddableMigrations = mapValues<
    MigrateFunctionsObject,
    SavedObjectMigrationFn<{ comment?: string }>
  >(
    migrationDeps.lensEmbeddableFactory().migrations,
    migrateByValueLensVisualizations
  ) as MigrateFunctionsObject;

  return mergeMigrationFunctionMaps(commentsMigrations, embeddableMigrations);
};

const migrateAlertsToObjects810 = (
  doc: SavedObjectUnsanitizedDoc<SeparatedAlertFields>,
  context: SavedObjectMigrationContext
): SavedObjectSanitizedDoc<{
  alerts?: Array<{
    id: string;
    index: string;
    rule: { id: string | null; name: string | null };
  }>;
}> => {
  const docWithReferences = { ...doc, references: doc.references ?? [] };

  const { attributes } = doc;

  if (!isAlertAttachment(attributes)) {
    return docWithReferences;
  }

  const alerts = buildAlertsObject({ docId: doc.id, attributes, context });

  // intentionally removing alertId, index, and rule, so we can create a new document with those fields
  // in a different place
  const { alertId, index, rule, ...restAttributes } = attributes;

  return {
    ...doc,
    attributes: {
      ...restAttributes,
      alerts,
    },
    references: doc.references ?? [],
  };
};

const isAlertAttachment = (
  attributes: SeparatedAlertFields
): attributes is AttributesTypeAlerts => {
  return AttributesTypeAlertsRt.is(attributes);
};

const buildAlertsObject = ({
  docId,
  attributes,
  context,
}: {
  docId: string;
  attributes: AttributesTypeAlerts;
  context: SavedObjectMigrationContext;
}) => {
  const { ids, indices } = getIDsAndIndicesAsArrays(attributes);

  const alertsWithIdsAsPrimaryArray = ids.map((id, iterIndex) => ({
    id,
    index: indices[iterIndex],
    rule: attributes.rule,
  }));

  if (ids.length === indices.length) {
    return alertsWithIdsAsPrimaryArray;
  }

  const errorMessage = `alertIds array size [${ids.length}] does not equal index array size [${
    indices.length
  }], alertIds: [${ids.join(',')}] indices: [${indices.join(',')}]`;

  logError({
    id: docId,
    context,
    error: errorMessage,
    docType: 'comment alert',
    docKey: 'comment',
  });

  // These should never really happen because we enforce the array lengths in the attach alert api call
  if (ids.length > indices.length) {
    // only return the alerts that we have indices for
    return indices.map((index, iterIndex) => ({
      id: ids[iterIndex],
      index,
      rule: attributes.rule,
    }));
  }

  return alertsWithIdsAsPrimaryArray;
};

export const migrateByValueLensVisualizations =
  (
    migrate: MigrateFunction,
    version: string
  ): SavedObjectMigrationFn<{ comment?: string }, { comment?: string }> =>
  (doc: SavedObjectUnsanitizedDoc<{ comment?: string }>, context: SavedObjectMigrationContext) => {
    if (doc.attributes.comment == null) {
      return doc;
    }

    try {
      const parsedComment = parseCommentString(doc.attributes.comment);
      const migratedComment = parsedComment.children.map((comment) => {
        if (isLensMarkdownNode(comment)) {
          // casting here because ts complains that comment isn't serializable because LensMarkdownNode
          // extends Node which has fields that conflict with SerializableRecord even though it is serializable
          return migrate(comment as SerializableRecord) as LensMarkdownNode;
        }

        return comment;
      });

      const migratedMarkdown = { ...parsedComment, children: migratedComment };

      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          comment: stringifyCommentWithoutTrailingNewline(doc.attributes.comment, migratedMarkdown),
        },
      };
    } catch (error) {
      logError({ id: doc.id, context, error, docType: 'comment', docKey: 'comment' });
      return doc;
    }
  };

export const stringifyCommentWithoutTrailingNewline = (
  originalComment: string,
  markdownNode: MarkdownNode
) => {
  const stringifiedComment = stringifyMarkdownComment(markdownNode);

  // if the original comment already ended with a newline then just leave it there
  if (originalComment.endsWith('\n')) {
    return stringifiedComment;
  }

  // the original comment did not end with a newline so the markdown library is going to add one, so let's remove it
  // so the comment stays consistent
  return trimEnd(stringifiedComment, '\n');
};

/**
 * merge function maps adds the context param from the original implementation at:
 * src/plugins/kibana_utils/common/persistable_state/merge_migration_function_map.ts
 *  */
export const mergeMigrationFunctionMaps = (
  // using the saved object framework types here because they include the context, this avoids type errors in our tests
  obj1: SavedObjectMigrationMap,
  obj2: SavedObjectMigrationMap
) => {
  const customizer = (objValue: SavedObjectMigrationFn, srcValue: SavedObjectMigrationFn) => {
    if (!srcValue || !objValue) {
      return srcValue || objValue;
    }
    return (doc: SavedObjectUnsanitizedDoc, context: SavedObjectMigrationContext) =>
      objValue(srcValue(doc, context), context);
  };

  return mergeWith({ ...obj1 }, obj2, customizer);
};
