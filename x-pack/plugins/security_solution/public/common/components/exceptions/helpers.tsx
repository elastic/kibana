/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText, EuiCommentProps, EuiAvatar } from '@elastic/eui';
import { capitalize, union } from 'lodash';
import moment from 'moment';
import uuid from 'uuid';

import * as i18n from './translations';
import {
  FormattedEntry,
  BuilderEntry,
  DescriptionListItem,
  FormattedBuilderEntry,
  CreateExceptionListItemBuilderSchema,
  ExceptionsBuilderExceptionItem,
} from './types';
import { EXCEPTION_OPERATORS, isOperator } from '../autocomplete/operators';
import { OperatorOption } from '../autocomplete/types';
import {
  CommentsArray,
  Comments,
  CreateComments,
  Entry,
  ExceptionListItemSchema,
  NamespaceType,
  OperatorTypeEnum,
  CreateExceptionListItemSchema,
  entry,
  entriesNested,
  createExceptionListItemSchema,
  exceptionListItemSchema,
  UpdateExceptionListItemSchema,
  ExceptionListType,
  EntryNested,
} from '../../../lists_plugin_deps';
import { IFieldType, IIndexPattern } from '../../../../../../../src/plugins/data/common';
import { TimelineNonEcsData } from '../../../graphql/types';
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
  if (entriesNested.is(item)) {
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
 * Formats ExceptionItem entries into simple field, operator, value
 * for use in rendering items in table
 *
 * @param entries an ExceptionItem's entries
 */
export const getFormattedEntries = (entries: BuilderEntry[]): FormattedEntry[] => {
  const formattedEntries = entries.map((item) => {
    if (entriesNested.is(item)) {
      const parent = {
        fieldName: item.field,
        operator: undefined,
        value: undefined,
        isNested: false,
      };
      return item.entries.reduce<FormattedEntry[]>(
        (acc, nestedEntry) => {
          const formattedEntry = formatEntry({
            isNested: true,
            parent: item.field,
            item: nestedEntry,
          });
          return [...acc, { ...formattedEntry }];
        },
        [parent]
      );
    } else {
      return formatEntry({ isNested: false, item });
    }
  });

  return formattedEntries.flat();
};

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
 * Helper method for `getFormattedEntries`
 */
export const formatEntry = ({
  isNested,
  parent,
  item,
}: {
  isNested: boolean;
  parent?: string;
  item: BuilderEntry;
}): FormattedEntry => {
  const operator = getExceptionOperatorSelect(item);
  const value = getEntryValue(item);

  return {
    fieldName: isNested ? `${parent}.${item.field}` : item.field ?? '',
    operator: operator.message,
    value,
    isNested,
  };
};

/**
 * Retrieves the values of tags marked as os
 *
 * @param tags an ExceptionItem's tags
 */
export const getOperatingSystems = (tags: string[]): string[] => {
  return tags.filter((tag) => tag.startsWith('os:')).map((os) => os.substring(3).trim());
};

/**
 * Formats os value array to a displayable string
 */
export const formatOperatingSystems = (osTypes: string[]): string => {
  return osTypes
    .map((os) => {
      if (os === 'macos') {
        return 'macOS';
      }
      return capitalize(os);
    })
    .join(', ');
};

/**
 * Returns all tags that match a given regex
 */
export const getTagsInclude = ({
  tags,
  regex,
}: {
  tags: string[];
  regex: RegExp;
}): [boolean, string | null] => {
  const matches: string[] | null = tags.join(';').match(regex);
  const match = matches != null ? matches[1] : null;
  return [matches != null, match];
};

/**
 * Formats ExceptionItem information for description list component
 *
 * @param exceptionItem an ExceptionItem
 */
export const getDescriptionListContent = (
  exceptionItem: ExceptionListItemSchema
): DescriptionListItem[] => {
  const details = [
    {
      title: i18n.OPERATING_SYSTEM,
      value: formatOperatingSystems(getOperatingSystems(exceptionItem._tags ?? [])),
    },
    {
      title: i18n.DATE_CREATED,
      value: moment(exceptionItem.created_at).format('MMMM Do YYYY @ HH:mm:ss'),
    },
    {
      title: i18n.CREATED_BY,
      value: exceptionItem.created_by,
    },
    {
      title: i18n.COMMENT,
      value: exceptionItem.description,
    },
  ];

  return details.reduce<DescriptionListItem[]>((acc, { value, title }) => {
    if (value != null && value.trim() !== '') {
      return [...acc, { title, description: value }];
    } else {
      return acc;
    }
  }, []);
};

/**
 * Formats ExceptionItem.comments into EuiCommentList format
 *
 * @param comments ExceptionItem.comments
 */
export const getFormattedComments = (comments: CommentsArray): EuiCommentProps[] =>
  comments.map((comment) => ({
    username: comment.created_by,
    timestamp: moment(comment.created_at).format('on MMM Do YYYY @ HH:mm:ss'),
    event: i18n.COMMENT_EVENT,
    timelineIcon: <EuiAvatar size="l" name={comment.created_by.toUpperCase()} />,
    children: <EuiText size="s">{comment.comment}</EuiText>,
    actions: (
      <WithCopyToClipboard
        data-test-subj="copy-to-clipboard"
        text={comment.comment}
        titleSummary={i18n.ADD_TO_CLIPBOARD}
      />
    ),
  }));

export const getFormattedBuilderEntries = (
  indexPattern: IIndexPattern,
  entries: BuilderEntry[]
): FormattedBuilderEntry[] => {
  const { fields } = indexPattern;
  return entries.map((item) => {
    if (entriesNested.is(item)) {
      return {
        parent: item.field,
        operator: isOperator,
        nested: getFormattedBuilderEntries(indexPattern, item.entries),
        field: undefined,
        value: undefined,
      };
    } else {
      const [selectedField] = fields.filter(
        ({ name }) => item.field != null && item.field === name
      );
      return {
        field: selectedField,
        operator: getExceptionOperatorSelect(item),
        value: getEntryValue(item),
      };
    }
  });
};

export const getValueFromOperator = (
  field: IFieldType | undefined,
  selectedOperator: OperatorOption
): Entry => {
  const fieldValue = field != null ? field.name : '';
  switch (selectedOperator.type) {
    case 'match':
      return {
        field: fieldValue,
        type: OperatorTypeEnum.MATCH,
        operator: selectedOperator.operator,
        value: '',
      };
    case 'match_any':
      return {
        field: fieldValue,
        type: OperatorTypeEnum.MATCH_ANY,
        operator: selectedOperator.operator,
        value: [],
      };
    case 'list':
      return {
        field: fieldValue,
        type: OperatorTypeEnum.LIST,
        operator: selectedOperator.operator,
        list: { id: '', type: 'ip' },
      };
    default:
      return {
        field: fieldValue,
        type: OperatorTypeEnum.EXISTS,
        operator: selectedOperator.operator,
      };
  }
};

export const getNewExceptionItem = ({
  listType,
  listId,
  namespaceType,
  ruleName,
}: {
  listType: ExceptionListType;
  listId: string;
  namespaceType: NamespaceType;
  ruleName: string;
}): CreateExceptionListItemBuilderSchema => {
  return {
    _tags: [listType],
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
      const entries = exception.entries.filter((t) => entry.is(t) || entriesNested.is(t));
      const item = { ...exception, entries };
      if (exceptionListItemSchema.is(item)) {
        return [...acc, item];
      } else if (createExceptionListItemSchema.is(item) && item.meta != null) {
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
  const {
    created_at,
    created_by,
    list_id,
    tie_breaker_id,
    updated_at,
    updated_by,
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
 * @param comments new Comments
 */
export const enrichExceptionItemsWithComments = (
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>,
  comments: Array<Comments | CreateComments>
): Array<ExceptionListItemSchema | CreateExceptionListItemSchema> => {
  return exceptionItems.map((item: ExceptionListItemSchema | CreateExceptionListItemSchema) => {
    return {
      ...item,
      comments,
    };
  });
};

/**
 * Adds provided osTypes to all exceptionItems if not present already
 * @param exceptionItems new or existing ExceptionItem[]
 * @param osTypes array of os values
 */
export const enrichExceptionItemsWithOS = (
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>,
  osTypes: string[]
): Array<ExceptionListItemSchema | CreateExceptionListItemSchema> => {
  const osTags = osTypes.map((os) => `os:${os}`);
  return exceptionItems.map((item: ExceptionListItemSchema | CreateExceptionListItemSchema) => {
    const newTags = item._tags ? union(item._tags, osTags) : [...osTags];
    return {
      ...item,
      _tags: newTags,
    };
  });
};

/**
 * Returns the value for the given fieldname within TimelineNonEcsData if it exists
 */
export const getMappedNonEcsValue = ({
  data,
  fieldName,
}: {
  data: TimelineNonEcsData[];
  fieldName: string;
}): string[] => {
  const item = data.find((d) => d.field === fieldName);
  if (item != null && item.value != null) {
    return item.value;
  }
  return [];
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
  listType: ExceptionListType,
  listId: string,
  ruleName: string,
  alertData: TimelineNonEcsData[]
): ExceptionsBuilderExceptionItem[] => {
  const [filePath] = getMappedNonEcsValue({ data: alertData, fieldName: 'file.path' });
  const [signatureSigner] = getMappedNonEcsValue({
    data: alertData,
    fieldName: 'file.Ext.code_signature.subject_name',
  });
  const [signatureTrusted] = getMappedNonEcsValue({
    data: alertData,
    fieldName: 'file.Ext.code_signature.trusted',
  });
  const [sha1Hash] = getMappedNonEcsValue({ data: alertData, fieldName: 'file.hash.sha1' });
  const namespaceType = 'agnostic';

  return [
    {
      ...getNewExceptionItem({ listType, listId, namespaceType, ruleName }),
      entries: [
        {
          field: 'file.path',
          operator: 'included',
          type: 'match',
          value: filePath ?? '',
        },
      ],
    },
    {
      ...getNewExceptionItem({ listType, listId, namespaceType, ruleName }),
      entries: [
        {
          field: 'file.Ext.code_signature.subject_name',
          operator: 'included',
          type: 'match',
          value: signatureSigner ?? '',
        },
        {
          field: 'file.Ext.code_signature.trusted',
          operator: 'included',
          type: 'match',
          value: signatureTrusted ?? '',
        },
      ],
    },
    {
      ...getNewExceptionItem({ listType, listId, namespaceType, ruleName }),
      entries: [
        {
          field: 'file.hash.sha1',
          operator: 'included',
          type: 'match',
          value: sha1Hash ?? '',
        },
      ],
    },
    {
      ...getNewExceptionItem({ listType, listId, namespaceType, ruleName }),
      entries: [
        {
          field: 'event.category',
          operator: 'included',
          type: 'match_any',
          value: getMappedNonEcsValue({ data: alertData, fieldName: 'event.category' }),
        },
      ],
    },
  ];
};
