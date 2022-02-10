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

import {
  comment,
  osType,
  CommentsArray,
  Comment,
  CreateComment,
  Entry,
  NamespaceType,
  EntryNested,
  OsTypeArray,
  ExceptionListType,
  ListOperatorTypeEnum as OperatorTypeEnum,
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import {
  getOperatorType,
  getNewExceptionItem,
  addIdToEntries,
  ExceptionsBuilderExceptionItem,
} from '@kbn/securitysolution-list-utils';
import type { DataViewBase } from '@kbn/es-query';
import * as i18n from './translations';
import { AlertData, Flattened } from './types';

import { Ecs } from '../../../../common/ecs';
import { CodeSignature } from '../../../../common/ecs/file';
import { WithCopyToClipboard } from '../../lib/clipboard/with_copy_to_clipboard';
import exceptionableLinuxFields from './exceptionable_linux_fields.json';
import exceptionableWindowsMacFields from './exceptionable_windows_mac_fields.json';
import exceptionableEndpointFields from './exceptionable_endpoint_fields.json';
import { EXCEPTIONABLE_ENDPOINT_EVENT_FIELDS } from '../../../../common/endpoint/exceptions/exceptionable_endpoint_event_fields';
import { ALERT_ORIGINAL_EVENT } from '../../../../common/field_maps/field_names';

export const filterIndexPatterns = (
  patterns: DataViewBase,
  type: ExceptionListType,
  osTypes?: OsTypeArray
): DataViewBase => {
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
          EXCEPTIONABLE_ENDPOINT_EVENT_FIELDS.includes(name)
        ),
      };
    default:
      return patterns;
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
            ? itemEntry.field.replace(/^event./, `${ALERT_ORIGINAL_EVENT}.`)
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
    const os =
      alertData?.agent?.type === 'endpoint'
        ? alertData.host?.os?.name?.toLowerCase()
        : alertData.host?.os?.family;
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
        subjectName: signature?.subject_name ?? '',
        trusted: signature?.trusted?.toString() ?? '',
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

// helper type to filter empty-valued exception entries
interface ExceptionEntry {
  value?: string;
  entries?: ExceptionEntry[];
}

/**
 * Takes an array of Entries and filter out the ones with empty values.
 * It will also filter out empty values for nested entries.
 */
function filterEmptyExceptionEntries<T extends ExceptionEntry>(entries: T[]): T[] {
  const finalEntries: T[] = [];
  for (const entry of entries) {
    if (entry.entries !== undefined) {
      entry.entries = entry.entries.filter((el) => el.value !== undefined && el.value.length > 0);
      finalEntries.push(entry);
    } else if (entry.value !== undefined && entry.value.length > 0) {
      finalEntries.push(entry);
    }
  }
  return finalEntries;
}

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
  const isLinux = host?.os?.name === 'Linux';

  const commonFields: Array<{
    field: string;
    operator: 'excluded' | 'included';
    type: 'match';
    value: string;
  }> = [
    {
      field: isLinux ? 'file.path' : 'file.path.caseless',
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
  ];
  const entriesToAdd = () => {
    if (isLinux) {
      return addIdToEntries(commonFields);
    } else {
      return addIdToEntries([
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
        ...commonFields,
      ]);
    }
  };

  return {
    ...getNewExceptionItem({ listId, namespaceType: listNamespace, ruleName }),
    entries: entriesToAdd(),
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

export const getPrepopulatedMemorySignatureException = ({
  listId,
  ruleName,
  eventCode,
  listNamespace = 'agnostic',
  alertEcsData,
}: {
  listId: string;
  listNamespace?: NamespaceType;
  ruleName: string;
  eventCode: string;
  alertEcsData: Flattened<Ecs>;
}): ExceptionsBuilderExceptionItem => {
  const { process } = alertEcsData;
  const entries = filterEmptyExceptionEntries([
    {
      field: 'Memory_protection.feature',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.Memory_protection?.feature ?? '',
    },
    {
      field: 'process.executable.caseless',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.executable ?? '',
    },
    {
      field: 'process.name.caseless',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.name ?? '',
    },
    {
      field: 'process.hash.sha256',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.hash?.sha256 ?? '',
    },
  ]);
  return {
    ...getNewExceptionItem({ listId, namespaceType: listNamespace, ruleName }),
    entries: addIdToEntries(entries),
  };
};
export const getPrepopulatedMemoryShellcodeException = ({
  listId,
  ruleName,
  eventCode,
  listNamespace = 'agnostic',
  alertEcsData,
}: {
  listId: string;
  listNamespace?: NamespaceType;
  ruleName: string;
  eventCode: string;
  alertEcsData: Flattened<Ecs>;
}): ExceptionsBuilderExceptionItem => {
  const { process } = alertEcsData;
  const entries = filterEmptyExceptionEntries([
    {
      field: 'Memory_protection.feature',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.Memory_protection?.feature ?? '',
    },
    {
      field: 'Memory_protection.self_injection',
      operator: 'included' as const,
      type: 'match' as const,
      value: String(alertEcsData.Memory_protection?.self_injection) ?? '',
    },
    {
      field: 'process.executable.caseless',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.executable ?? '',
    },
    {
      field: 'process.name.caseless',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.name ?? '',
    },
    {
      field: 'process.Ext.token.integrity_level_name',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.Ext?.token?.integrity_level_name ?? '',
    },
  ]);

  return {
    ...getNewExceptionItem({ listId, namespaceType: listNamespace, ruleName }),
    entries: addIdToEntries(entries),
  };
};

export const getPrepopulatedBehaviorException = ({
  listId,
  ruleName,
  eventCode,
  listNamespace = 'agnostic',
  alertEcsData,
}: {
  listId: string;
  listNamespace?: NamespaceType;
  ruleName: string;
  eventCode: string;
  alertEcsData: Flattened<Ecs>;
}): ExceptionsBuilderExceptionItem => {
  const { process } = alertEcsData;
  const entries = filterEmptyExceptionEntries([
    {
      field: 'rule.id',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.rule?.id ?? '',
    },
    {
      field: 'process.executable.caseless',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.executable ?? '',
    },
    {
      field: 'process.command_line',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.command_line ?? '',
    },
    {
      field: 'process.parent.executable',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.parent?.executable ?? '',
    },
    {
      field: 'process.code_signature.subject_name',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.code_signature?.subject_name ?? '',
    },
    {
      field: 'file.path',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.file?.path ?? '',
    },
    {
      field: 'file.name',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.file?.name ?? '',
    },
    {
      field: 'source.ip',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.source?.ip ?? '',
    },
    {
      field: 'destination.ip',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.destination?.ip ?? '',
    },
    {
      field: 'registry.path',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.registry?.path ?? '',
    },
    {
      field: 'registry.value',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.registry?.value ?? '',
    },
    {
      field: 'registry.data.strings',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.registry?.data?.strings ?? '',
    },
    {
      field: 'dll.path',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.dll?.path ?? '',
    },
    {
      field: 'dll.code_signature.subject_name',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.dll?.code_signature?.subject_name ?? '',
    },
    {
      field: 'dll.pe.original_file_name',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.dll?.pe?.original_file_name ?? '',
    },
    {
      field: 'dns.question.name',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.dns?.question?.name ?? '',
    },
    {
      field: 'dns.question.type',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.dns?.question?.type ?? '',
    },
    {
      field: 'user.id',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.user?.id ?? '',
    },
  ]);
  return {
    ...getNewExceptionItem({ listId, namespaceType: listNamespace, ruleName }),
    entries: addIdToEntries(entries),
  };
};

/**
 * Determines whether or not any entries within the given exceptionItems contain values not in the specified ECS mapping
 */
export const entryHasNonEcsType = (
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>,
  indexPatterns: DataViewBase
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
  alertEcsData: Flattened<Ecs> & { 'event.code'?: string }
): ExceptionsBuilderExceptionItem[] => {
  const eventCode = alertEcsData['event.code'] ?? alertEcsData.event?.code;

  switch (eventCode) {
    case 'behavior':
      return [
        getPrepopulatedBehaviorException({
          listId,
          ruleName,
          eventCode,
          alertEcsData,
        }),
      ];
    case 'memory_signature':
      return [
        getPrepopulatedMemorySignatureException({
          listId,
          ruleName,
          eventCode,
          alertEcsData,
        }),
      ];
    case 'shellcode_thread':
      return [
        getPrepopulatedMemoryShellcodeException({
          listId,
          ruleName,
          eventCode,
          alertEcsData,
        }),
      ];
    case 'ransomware':
      return getProcessCodeSignature(alertEcsData).map((codeSignature) =>
        getPrepopulatedRansomwareException({
          listId,
          ruleName,
          eventCode,
          codeSignature,
          alertEcsData,
        })
      );
    default:
      // By default return the standard prepopulated Endpoint Exception fields
      return getFileCodeSignature(alertEcsData).map((codeSignature) =>
        getPrepopulatedEndpointException({
          listId,
          ruleName,
          eventCode: eventCode ?? '',
          codeSignature,
          alertEcsData,
        })
      );
  }
};
