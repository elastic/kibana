/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText, EuiCommentProps, EuiAvatar } from '@elastic/eui';
import { capitalize } from 'lodash';
import moment from 'moment';
import uuid from 'uuid';

import * as i18n from './translations';
import {
  BuilderEntry,
  CreateExceptionListItemBuilderSchema,
  ExceptionsBuilderExceptionItem,
} from './types';
import { EXCEPTION_OPERATORS, isOperator } from '../autocomplete/operators';
import { OperatorOption } from '../autocomplete/types';
import {
  CommentsArray,
  Comment,
  CreateComment,
  Entry,
  ExceptionListItemSchema,
  NamespaceType,
  OperatorTypeEnum,
  CreateExceptionListItemSchema,
  comment,
  entry,
  entriesNested,
  createExceptionListItemSchema,
  exceptionListItemSchema,
  UpdateExceptionListItemSchema,
  EntryNested,
  OsTypeArray,
} from '../../../shared_imports';
import { IIndexPattern } from '../../../../../../../src/plugins/data/common';
import { validate } from '../../../../common/validate';
import { Ecs } from '../../../../common/ecs';
import { CodeSignature } from '../../../../common/ecs/file';
import { WithCopyToClipboard } from '../../lib/clipboard/with_copy_to_clipboard';

/**
 * Returns the operator type, may not need this if using io-ts types
 *
 * @param item a single ExceptionItem entry
 */
export const getOperatorType = (item: BuilderEntry): OperatorTypeEnum => {
  switch (item.type) {
    case 'match':
      return OperatorTypeEnum.MATCH;
    case 'match_any':
      return OperatorTypeEnum.MATCH_ANY;
    case 'list':
      return OperatorTypeEnum.LIST;
    default:
      return OperatorTypeEnum.EXISTS;
  }
};

/**
 * Determines operator selection (is/is not/is one of, etc.)
 * Default operator is "is"
 *
 * @param item a single ExceptionItem entry
 */
export const getExceptionOperatorSelect = (item: BuilderEntry): OperatorOption => {
  if (item.type === 'nested') {
    return isOperator;
  } else {
    const operatorType = getOperatorType(item);
    const foundOperator = EXCEPTION_OPERATORS.find((operatorOption) => {
      return item.operator === operatorOption.operator && operatorType === operatorOption.type;
    });

    return foundOperator ?? isOperator;
  }
};

/**
 * Returns the fields corresponding value for an entry
 *
 * @param item a single ExceptionItem entry
 */
export const getEntryValue = (item: BuilderEntry): string | string[] | undefined => {
  switch (item.type) {
    case OperatorTypeEnum.MATCH:
    case OperatorTypeEnum.MATCH_ANY:
      return item.value;
    case OperatorTypeEnum.EXISTS:
      return undefined;
    case OperatorTypeEnum.LIST:
      return item.list.id;
    default:
      return undefined;
  }
};

/**
 * Formats os value array to a displayable string
 */
export const formatOperatingSystems = (osTypes: string[]): string => {
  return osTypes
    .filter((os) => ['linux', 'macos', 'windows'].includes(os))
    .map((os) => {
      if (os === 'macos') {
        return 'macOS';
      }
      return capitalize(os);
    })
    .join(', ');
};

/**
 * Formats ExceptionItem.comments into EuiCommentList format
 *
 * @param comments ExceptionItem.comments
 */
export const getFormattedComments = (comments: CommentsArray): EuiCommentProps[] =>
  comments.map((commentItem) => ({
    username: commentItem.created_by,
    timestamp: moment(commentItem.created_at).format('on MMM Do YYYY @ HH:mm:ss'),
    event: i18n.COMMENT_EVENT,
    timelineIcon: <EuiAvatar size="l" name={commentItem.created_by.toUpperCase()} />,
    children: <EuiText size="s">{commentItem.comment}</EuiText>,
    actions: (
      <WithCopyToClipboard
        data-test-subj="copy-to-clipboard"
        text={commentItem.comment}
        titleSummary={i18n.ADD_TO_CLIPBOARD}
      />
    ),
  }));

export const getNewExceptionItem = ({
  listId,
  namespaceType,
  ruleName,
}: {
  listId: string;
  namespaceType: NamespaceType;
  ruleName: string;
}): CreateExceptionListItemBuilderSchema => {
  return {
    comments: [],
    description: `${ruleName} - exception list item`,
    entries: [
      {
        field: '',
        operator: 'included',
        type: 'match',
        value: '',
      },
    ],
    item_id: undefined,
    list_id: listId,
    meta: {
      temporaryUuid: uuid.v4(),
    },
    name: `${ruleName} - exception list item`,
    namespace_type: namespaceType,
    tags: [],
    type: 'simple',
  };
};

export const filterExceptionItems = (
  exceptions: ExceptionsBuilderExceptionItem[]
): Array<ExceptionListItemSchema | CreateExceptionListItemSchema> => {
  return exceptions.reduce<Array<ExceptionListItemSchema | CreateExceptionListItemSchema>>(
    (acc, exception) => {
      const entries = exception.entries.filter((t) => {
        const [validatedEntry] = validate(t, entry);
        const [validatedNestedEntry] = validate(t, entriesNested);

        if (validatedEntry != null || validatedNestedEntry != null) {
          return true;
        }

        return false;
      });

      const item = { ...exception, entries };

      if (exceptionListItemSchema.is(item)) {
        return [...acc, item];
      } else if (createExceptionListItemSchema.is(item)) {
        const { meta, ...rest } = item;
        const itemSansMetaId: CreateExceptionListItemSchema = { ...rest, meta: undefined };
        return [...acc, itemSansMetaId];
      } else {
        return acc;
      }
    },
    []
  );
};

export const formatExceptionItemForUpdate = (
  exceptionItem: ExceptionListItemSchema
): UpdateExceptionListItemSchema => {
  /* eslint-disable @typescript-eslint/naming-convention */
  const {
    created_at,
    created_by,
    list_id,
    tie_breaker_id,
    updated_at,
    updated_by,
    /* eslint-enable @typescript-eslint/naming-convention */
    ...fieldsToUpdate
  } = exceptionItem;
  return {
    ...fieldsToUpdate,
  };
};

/**
 * Maps "event." fields to "signal.original_event.". This is because when a rule is created
 * the "event" field is copied over to "original_event". When the user creates an exception,
 * they expect it to match against the original_event's fields, not the signal event's.
 * @param exceptionItems new or existing ExceptionItem[]
 */
export const prepareExceptionItemsForBulkClose = (
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
): Array<ExceptionListItemSchema | CreateExceptionListItemSchema> => {
  return exceptionItems.map((item: ExceptionListItemSchema | CreateExceptionListItemSchema) => {
    if (item.entries !== undefined) {
      const newEntries = item.entries.map((itemEntry: Entry | EntryNested) => {
        return {
          ...itemEntry,
          field: itemEntry.field.startsWith('event.')
            ? itemEntry.field.replace(/^event./, 'signal.original_event.')
            : itemEntry.field,
        };
      });
      return {
        ...item,
        entries: newEntries,
      };
    } else {
      return item;
    }
  });
};

/**
 * Adds new and existing comments to all new exceptionItems if not present already
 * @param exceptionItems new or existing ExceptionItem[]
 * @param comments new Comment
 */
export const enrichNewExceptionItemsWithComments = (
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>,
  comments: Array<Comment | CreateComment>
): Array<ExceptionListItemSchema | CreateExceptionListItemSchema> => {
  return exceptionItems.map((item: ExceptionListItemSchema | CreateExceptionListItemSchema) => {
    return {
      ...item,
      comments,
    };
  });
};

/**
 * Adds new and existing comments to exceptionItem
 * @param exceptionItem existing ExceptionItem
 * @param comments array of comments that can include existing
 * and new comments
 */
export const enrichExistingExceptionItemWithComments = (
  exceptionItem: ExceptionListItemSchema | CreateExceptionListItemSchema,
  comments: Array<Comment | CreateComment>
): ExceptionListItemSchema | CreateExceptionListItemSchema => {
  const formattedComments = comments.map((item) => {
    if (comment.is(item)) {
      const { id, comment: existingComment } = item;
      return {
        id,
        comment: existingComment,
      };
    } else {
      return {
        comment: item.comment,
      };
    }
  });

  return {
    ...exceptionItem,
    comments: formattedComments,
  };
};

/**
 * Adds provided osTypes to all exceptionItems if not present already
 * @param exceptionItems new or existing ExceptionItem[]
 * @param osTypes array of os values
 */
export const enrichExceptionItemsWithOS = (
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>,
  osTypes: OsTypeArray
): Array<ExceptionListItemSchema | CreateExceptionListItemSchema> => {
  return exceptionItems.map((item: ExceptionListItemSchema | CreateExceptionListItemSchema) => {
    return {
      ...item,
      os_types: osTypes,
    };
  });
};

/**
 * Returns given exceptionItems with all hash-related entries lowercased
 */
export const lowercaseHashValues = (
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
): Array<ExceptionListItemSchema | CreateExceptionListItemSchema> => {
  return exceptionItems.map((item) => {
    const newEntries = item.entries.map((itemEntry) => {
      if (itemEntry.field.includes('.hash')) {
        if (itemEntry.type === 'match') {
          return {
            ...itemEntry,
            value: itemEntry.value.toLowerCase(),
          };
        } else if (itemEntry.type === 'match_any') {
          return {
            ...itemEntry,
            value: itemEntry.value.map((val) => val.toLowerCase()),
          };
        }
      }
      return itemEntry;
    });
    return {
      ...item,
      entries: newEntries,
    };
  });
};

export const entryHasListType = (
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
) => {
  for (const { entries } of exceptionItems) {
    for (const exceptionEntry of entries ?? []) {
      if (getOperatorType(exceptionEntry) === OperatorTypeEnum.LIST) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Returns the value for `file.Ext.code_signature` which
 * can be an object or array of objects
 */
export const getCodeSignatureValue = (
  alertData: Ecs
): Array<{ subjectName: string; trusted: string }> => {
  const { file } = alertData;
  const codeSignature = file && file.Ext && file.Ext.code_signature;

  // Pre 7.10 file.Ext.code_signature was mistakenly populated as
  // a single object with subject_name and trusted.
  if (Array.isArray(codeSignature) && codeSignature.length > 0) {
    return codeSignature.map((signature) => ({
      subjectName: (signature.subject_name && signature.subject_name[0]) ?? '',
      trusted: (signature.trusted && signature.trusted[0]) ?? '',
    }));
  } else {
    const signature: CodeSignature | undefined = !Array.isArray(codeSignature)
      ? codeSignature
      : undefined;
    const subjectName: string | undefined =
      signature && signature.subject_name && signature.subject_name[0];
    const trusted: string | undefined = signature && signature.trusted && signature.trusted[0];

    return [
      {
        subjectName: subjectName ?? '',
        trusted: trusted ?? '',
      },
    ];
  }
};

/**
 * Returns the default values from the alert data to autofill new endpoint exceptions
 */
export const getPrepopulatedItem = ({
  listId,
  ruleName,
  codeSignature,
  filePath,
  sha256Hash,
  eventCode,
  listNamespace = 'agnostic',
}: {
  listId: string;
  listNamespace?: NamespaceType;
  ruleName: string;
  codeSignature: { subjectName: string; trusted: string };
  filePath: string;
  sha256Hash: string;
  eventCode: string;
}): ExceptionsBuilderExceptionItem => {
  return {
    ...getNewExceptionItem({ listId, namespaceType: listNamespace, ruleName }),
    entries: [
      {
        field: 'file.Ext.code_signature',
        type: 'nested',
        entries: [
          {
            field: 'subject_name',
            operator: 'included',
            type: 'match',
            value: codeSignature != null ? codeSignature.subjectName : '',
          },
          {
            field: 'trusted',
            operator: 'included',
            type: 'match',
            value: codeSignature != null ? codeSignature.trusted : '',
          },
        ],
      },
      {
        field: 'file.path.caseless',
        operator: 'included',
        type: 'match',
        value: filePath ?? '',
      },
      {
        field: 'file.hash.sha256',
        operator: 'included',
        type: 'match',
        value: sha256Hash ?? '',
      },
      {
        field: 'event.code',
        operator: 'included',
        type: 'match',
        value: eventCode ?? '',
      },
    ],
  };
};

/**
 * Determines whether or not any entries within the given exceptionItems contain values not in the specified ECS mapping
 */
export const entryHasNonEcsType = (
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>,
  indexPatterns: IIndexPattern
): boolean => {
  const doesFieldNameExist = (exceptionEntry: Entry): boolean => {
    return indexPatterns.fields.some(({ name }) => name === exceptionEntry.field);
  };

  if (exceptionItems.length === 0) {
    return false;
  }
  for (const { entries } of exceptionItems) {
    for (const exceptionEntry of entries ?? []) {
      if (exceptionEntry.type === 'nested') {
        for (const nestedExceptionEntry of exceptionEntry.entries) {
          if (doesFieldNameExist(nestedExceptionEntry) === false) {
            return true;
          }
        }
      } else if (doesFieldNameExist(exceptionEntry) === false) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Returns the default values from the alert data to autofill new endpoint exceptions
 */
export const defaultEndpointExceptionItems = (
  listId: string,
  ruleName: string,
  alertEcsData: Ecs
): ExceptionsBuilderExceptionItem[] => {
  const { file, event: alertEvent } = alertEcsData;

  return getCodeSignatureValue(alertEcsData).map((codeSignature) =>
    getPrepopulatedItem({
      listId,
      ruleName,
      filePath: file && file.path ? file.path[0] : '',
      sha256Hash: file && file.hash && file.hash.sha256 ? file.hash.sha256[0] : '',
      eventCode: alertEvent && alertEvent.code ? alertEvent.code[0] : '',
      codeSignature,
    })
  );
};
