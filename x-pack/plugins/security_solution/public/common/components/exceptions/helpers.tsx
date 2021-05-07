/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiCommentProps, EuiAvatar } from '@elastic/eui';
import { capitalize } from 'lodash';
import moment from 'moment';
import uuid from 'uuid';

import * as i18n from './translations';
import {
  AlertData,
  BuilderEntry,
  CreateExceptionListItemBuilderSchema,
  ExceptionsBuilderExceptionItem,
  Flattened,
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
  nestedEntryItem,
  createExceptionListItemSchema,
  exceptionListItemSchema,
  UpdateExceptionListItemSchema,
  EntryNested,
  OsTypeArray,
  EntriesArray,
  osType,
  ExceptionListType,
} from '../../../shared_imports';
import { IIndexPattern } from '../../../../../../../src/plugins/data/common';
import { validate } from '../../../../common/validate';
import { Ecs } from '../../../../common/ecs';
import { CodeSignature } from '../../../../common/ecs/file';
import { WithCopyToClipboard } from '../../lib/clipboard/with_copy_to_clipboard';
import { addIdToItem, removeIdFromItem } from '../../../../common';
import exceptionableLinuxFields from './exceptionable_linux_fields.json';
import exceptionableWindowsMacFields from './exceptionable_windows_mac_fields.json';
import exceptionableEndpointFields from './exceptionable_endpoint_fields.json';
import exceptionableEndpointEventFields from './exceptionable_endpoint_event_fields.json';

export const filterIndexPatterns = (
  patterns: IIndexPattern,
  type: ExceptionListType,
  osTypes?: OsTypeArray
): IIndexPattern => {
  switch (type) {
    case 'endpoint':
      const osFilterForEndpoint: (name: string) => boolean = osTypes?.includes('linux')
        ? (name: string) =>
            exceptionableLinuxFields.includes(name) || exceptionableEndpointFields.includes(name)
        : (name: string) =>
            exceptionableWindowsMacFields.includes(name) ||
            exceptionableEndpointFields.includes(name);

      return {
        ...patterns,
        fields: patterns.fields.filter(({ name }) => osFilterForEndpoint(name)),
      };
    case 'endpoint_events':
      return {
        ...patterns,
        fields: patterns.fields.filter(({ name }) =>
          exceptionableEndpointEventFields.includes(name)
        ),
      };
    default:
      return patterns;
  }
};

export const addIdToEntries = (entries: EntriesArray): EntriesArray => {
  return entries.map((singleEntry) => {
    if (singleEntry.type === 'nested') {
      return addIdToItem({
        ...singleEntry,
        entries: singleEntry.entries.map((nestedEntry) => addIdToItem(nestedEntry)),
      });
    } else {
      return addIdToItem(singleEntry);
    }
  });
};

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
    entries: addIdToEntries([
      {
        field: '',
        operator: 'included',
        type: 'match',
        value: '',
      },
    ]),
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
      const entries = exception.entries.reduce<BuilderEntry[]>((nestedAcc, singleEntry) => {
        const strippedSingleEntry = removeIdFromItem(singleEntry);

        if (entriesNested.is(strippedSingleEntry)) {
          const nestedEntriesArray = strippedSingleEntry.entries.filter((singleNestedEntry) => {
            const noIdSingleNestedEntry = removeIdFromItem(singleNestedEntry);
            const [validatedNestedEntry] = validate(noIdSingleNestedEntry, nestedEntryItem);
            return validatedNestedEntry != null;
          });
          const noIdNestedEntries = nestedEntriesArray.map((singleNestedEntry) =>
            removeIdFromItem(singleNestedEntry)
          );

          const [validatedNestedEntry] = validate(
            { ...strippedSingleEntry, entries: noIdNestedEntries },
            entriesNested
          );

          if (validatedNestedEntry != null) {
            return [...nestedAcc, { ...singleEntry, entries: nestedEntriesArray }];
          }
          return nestedAcc;
        } else {
          const [validatedEntry] = validate(strippedSingleEntry, entry);

          if (validatedEntry != null) {
            return [...nestedAcc, singleEntry];
          }
          return nestedAcc;
        }
      }, []);

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

export const buildGetAlertByIdQuery = (id: string | undefined) => ({
  query: {
    match: {
      _id: {
        query: id || '',
      },
    },
  },
});

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

export const retrieveAlertOsTypes = (alertData?: AlertData): OsTypeArray => {
  const osDefaults: OsTypeArray = ['windows', 'macos'];
  if (alertData != null) {
    const os = alertData.host && alertData.host.os && alertData.host.os.family;
    if (os != null) {
      return osType.is(os) ? [os] : osDefaults;
    }
  }
  return osDefaults;
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
export const getFileCodeSignature = (
  alertData: Flattened<Ecs>
): Array<{ subjectName: string; trusted: string }> => {
  const { file } = alertData;
  const codeSignature = file && file.Ext && file.Ext.code_signature;

  return getCodeSignatureValue(codeSignature);
};

/**
 * Returns the value for `process.Ext.code_signature` which
 * can be an object or array of objects
 */
export const getProcessCodeSignature = (
  alertData: Flattened<Ecs>
): Array<{ subjectName: string; trusted: string }> => {
  const { process } = alertData;
  const codeSignature = process && process.Ext && process.Ext.code_signature;
  return getCodeSignatureValue(codeSignature);
};

/**
 * Pre 7.10 `Ext.code_signature` fields were mistakenly populated as
 * a single object with subject_name and trusted.
 */
export const getCodeSignatureValue = (
  codeSignature: Flattened<CodeSignature> | Flattened<CodeSignature[]> | undefined
): Array<{ subjectName: string; trusted: string }> => {
  if (Array.isArray(codeSignature) && codeSignature.length > 0) {
    return codeSignature.map((signature) => {
      return {
        subjectName: signature.subject_name ?? '',
        trusted: signature.trusted.toString() ?? '',
      };
    });
  } else {
    const signature: Flattened<CodeSignature> | undefined = !Array.isArray(codeSignature)
      ? codeSignature
      : undefined;

    return [
      {
        subjectName: signature?.subject_name ?? '',
        trusted: signature?.trusted ?? '',
      },
    ];
  }
};

/**
 * Returns the default values from the alert data to autofill new endpoint exceptions
 */
export const getPrepopulatedEndpointException = ({
  listId,
  ruleName,
  codeSignature,
  eventCode,
  listNamespace = 'agnostic',
  alertEcsData,
}: {
  listId: string;
  listNamespace?: NamespaceType;
  ruleName: string;
  codeSignature: { subjectName: string; trusted: string };
  eventCode: string;
  alertEcsData: Flattened<Ecs>;
}): ExceptionsBuilderExceptionItem => {
  const { file, host } = alertEcsData;
  const filePath = file?.path ?? '';
  const sha256Hash = file?.hash?.sha256 ?? '';
  const filePathDefault = host?.os?.family === 'linux' ? 'file.path' : 'file.path.caseless';

  return {
    ...getNewExceptionItem({ listId, namespaceType: listNamespace, ruleName }),
    entries: addIdToEntries([
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
        field: filePathDefault,
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
    ]),
  };
};

/**
 * Returns the default values from the alert data to autofill new endpoint exceptions
 */
export const getPrepopulatedRansomwareException = ({
  listId,
  ruleName,
  codeSignature,
  eventCode,
  listNamespace = 'agnostic',
  alertEcsData,
}: {
  listId: string;
  listNamespace?: NamespaceType;
  ruleName: string;
  codeSignature: { subjectName: string; trusted: string };
  eventCode: string;
  alertEcsData: Flattened<Ecs>;
}): ExceptionsBuilderExceptionItem => {
  const { process, Ransomware } = alertEcsData;
  const sha256Hash = process?.hash?.sha256 ?? '';
  const executable = process?.executable ?? '';
  const ransomwareFeature = Ransomware?.feature ?? '';
  return {
    ...getNewExceptionItem({ listId, namespaceType: listNamespace, ruleName }),
    entries: addIdToEntries([
      {
        field: 'process.Ext.code_signature',
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
        field: 'process.executable',
        operator: 'included',
        type: 'match',
        value: executable ?? '',
      },
      {
        field: 'process.hash.sha256',
        operator: 'included',
        type: 'match',
        value: sha256Hash ?? '',
      },
      {
        field: 'Ransomware.feature',
        operator: 'included',
        type: 'match',
        value: ransomwareFeature ?? '',
      },
      {
        field: 'event.code',
        operator: 'included',
        type: 'match',
        value: eventCode ?? '',
      },
    ]),
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
  alertEcsData: Flattened<Ecs>
): ExceptionsBuilderExceptionItem[] => {
  const { event: alertEvent } = alertEcsData;
  const eventCode = alertEvent?.code ?? '';

  if (eventCode === 'ransomware') {
    return getProcessCodeSignature(alertEcsData).map((codeSignature) =>
      getPrepopulatedRansomwareException({
        listId,
        ruleName,
        eventCode,
        codeSignature,
        alertEcsData,
      })
    );
  }

  // By default return the standard prepopulated Endpoint Exception fields
  return getFileCodeSignature(alertEcsData).map((codeSignature) =>
    getPrepopulatedEndpointException({
      listId,
      ruleName,
      eventCode,
      codeSignature,
      alertEcsData,
    })
  );
};
