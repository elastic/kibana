/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues, trimEnd, cloneDeep, unset } from 'lodash';
import type { SerializableRecord } from '@kbn/utility-types';
import type { MigrateFunction, MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import type {
  SavedObjectUnsanitizedDoc,
  SavedObjectSanitizedDoc,
  SavedObjectMigrationFn,
  SavedObjectMigrationMap,
  SavedObjectMigrationContext,
} from '@kbn/core/server';
import { mergeSavedObjectMigrationMaps } from '@kbn/core/server';
import type { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import type { CommentAttributes } from '../../../common/api';
import { CommentType } from '../../../common/api';
import type { LensMarkdownNode, MarkdownNode } from '../../../common/utils/markdown_plugins/utils';
import {
  isLensMarkdownNode,
  parseCommentString,
  stringifyMarkdownComment,
} from '../../../common/utils/markdown_plugins/utils';
import type { SanitizedCaseOwner } from '.';
import { addOwnerToSO } from '.';
import { logError } from './utils';
import { GENERATED_ALERT, SUB_CASE_SAVED_OBJECT } from './constants';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import { getAllPersistableAttachmentMigrations } from './get_all_persistable_attachment_migrations';
import type { PersistableStateAttachmentState } from '../../attachment_framework/types';

interface UnsanitizedComment {
  comment: string;
  type?: CommentType;
}

interface SanitizedComment {
  comment: string;
  type: CommentType;
}

enum AssociationType {
  case = 'case',
}

interface SanitizedCommentWithAssociation {
  associationType: AssociationType;
  rule?: { id: string | null; name: string | null };
}

export interface CreateCommentsMigrationsDeps {
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
}

export const createCommentsMigrations = (
  migrationDeps: CreateCommentsMigrationsDeps
): SavedObjectMigrationMap => {
  const lensMigrations = migrationDeps.lensEmbeddableFactory().migrations;
  const lensMigrationObject =
    typeof lensMigrations === 'function' ? lensMigrations() : lensMigrations || {};

  const embeddableMigrations = mapValues<
    MigrateFunctionsObject,
    SavedObjectMigrationFn<{ comment?: string }>
  >(lensMigrationObject, migrateByValueLensVisualizations) as MigrateFunctionsObject;

  const persistableStateAttachmentMigrations = mapValues<
    MigrateFunctionsObject,
    SavedObjectMigrationFn<CommentAttributes>
  >(
    getAllPersistableAttachmentMigrations(migrationDeps.persistableStateAttachmentTypeRegistry),
    migratePersistableStateAttachments
  ) as MigrateFunctionsObject;

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
    ): SavedObjectSanitizedDoc<unknown> => {
      let attributes: SanitizedCommentWithAssociation & UnsanitizedComment = {
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
    /*
     * This is to fix the issue here: https://github.com/elastic/kibana/issues/123089
     * Instead of migrating the rule information in the references array which was risky for 8.0
     * we decided to remove the information since the UI will do the look up for the rule information if
     * the backend returns it as null.
     *
     * The downside is it incurs extra query overhead.
     **/
    '8.0.0': removeRuleInformation,
    '8.1.0': removeAssociationType,
  };

  return mergeSavedObjectMigrationMaps(
    persistableStateAttachmentMigrations,
    mergeSavedObjectMigrationMaps(commentsMigrations, embeddableMigrations)
  );
};

export const migratePersistableStateAttachments =
  (migrate: MigrateFunction): SavedObjectMigrationFn<CommentAttributes, CommentAttributes> =>
  (doc: SavedObjectUnsanitizedDoc<CommentAttributes>) => {
    if (doc.attributes.type !== CommentType.persistableState) {
      return doc;
    }

    const { persistableStateAttachmentState, persistableStateAttachmentTypeId } = doc.attributes;

    const migratedState = migrate({
      persistableStateAttachmentState,
      persistableStateAttachmentTypeId,
    }) as PersistableStateAttachmentState;

    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        persistableStateAttachmentState: migratedState.persistableStateAttachmentState,
      },
      references: doc.references ?? [],
    };
  };

export const migrateByValueLensVisualizations =
  (migrate: MigrateFunction): SavedObjectMigrationFn<{ comment?: string }, { comment?: string }> =>
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

export const removeRuleInformation = (
  doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>
): SavedObjectSanitizedDoc<unknown> => {
  if (doc.attributes.type === CommentType.alert || doc.attributes.type === GENERATED_ALERT) {
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        rule: {
          id: null,
          name: null,
        },
      },
      references: doc.references ?? [],
    };
  }

  return {
    ...doc,
    references: doc.references ?? [],
  };
};

export const removeAssociationType = (
  doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>
): SavedObjectSanitizedDoc<Record<string, unknown>> => {
  const docCopy = cloneDeep(doc);
  unset(docCopy, 'attributes.associationType');

  return {
    ...docCopy,
    references:
      docCopy.references?.filter((reference) => reference.type !== SUB_CASE_SAVED_OBJECT) ?? [],
  };
};
