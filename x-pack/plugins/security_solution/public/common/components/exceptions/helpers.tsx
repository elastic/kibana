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
  EmptyListEntry,
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
} from '../../../lists_plugin_deps';
import { IFieldType, IIndexPattern } from '../../../../../../../src/plugins/data/common';

export const isListType = (item: BuilderEntry): item is EmptyListEntry =>
  item.type === OperatorTypeEnum.LIST;
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

export const getExceptionOperatorFromSelect = (value: string): OperatorOption => {
  const operator = EXCEPTION_OPERATORS.filter(({ message }) => message === value);
  return operator[0] ?? isOperator;
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

export const getOperatingSystems = (tags: string[]): string => {
  const osMatches = tags
    .filter((tag) => tag.startsWith('os:'))
    .map((os) => capitalize(os.substring(3).trim()))
    .join(', ');

  return osMatches;
};

export const getOsTagValues = (tags: string[]): string[] => {
  return tags.filter((tag) => tag.startsWith('os:')).map((os) => os.substring(3).trim());
};

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
      value: getOperatingSystems(exceptionItem._tags),
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

export const getMappedNonEcsValue = ({
  data,
  fieldName,
}: {
  data: TimelineNonEcsData[];
  fieldName: string;
}): string[] | undefined => {
  const item = data.find((d) => d.field === fieldName);
  if (item != null && item.value != null) {
    return item.value;
  }
  return undefined;
};

export const entryHasListType = (
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
) => {
  for (const { entries } of exceptionItems) {
    for (const exceptionEntry of entries ?? []) {
      if (getOperatorType(exceptionEntry) === 'list') {
        return true;
      }
    }
  }
  return false;
};

export const entryHasNonEcsType = (
  exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>,
  indexPatterns: IIndexPattern
): boolean => {
  if (exceptionItems.length === 0) {
    return false;
  }
  for (const { entries } of exceptionItems) {
    for (const exceptionEntry of entries ?? []) {
      if (indexPatterns.fields.find(({ name }) => name === exceptionEntry.field) === undefined) {
        return true;
      }
    }
  }
  return false;
};

export const defaultEndpointExceptionItems = (
  listType: ExceptionListType,
  listId: string,
  ruleName: string,
  alertData: TimelineNonEcsData[]
): ExceptionsBuilderExceptionItem[] => {
  const [filePath] = getMappedNonEcsValue({ data: alertData, fieldName: 'file.path' }) ?? [];
  const [signatureSigner] =
    getMappedNonEcsValue({ data: alertData, fieldName: 'file.Ext.code_signature.subject_name' }) ??
    [];
  const [signatureTrusted] =
    getMappedNonEcsValue({ data: alertData, fieldName: 'file.Ext.code_signature.trusted' }) ?? [];
  const [sha1Hash] = getMappedNonEcsValue({ data: alertData, fieldName: 'file.hash.sha1' }) ?? [];
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
          field: 'file.code_signature.trusted',
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
          value: getMappedNonEcsValue({ data: alertData, fieldName: 'event.category' }) ?? [],
        },
      ],
    },
  ];
};
