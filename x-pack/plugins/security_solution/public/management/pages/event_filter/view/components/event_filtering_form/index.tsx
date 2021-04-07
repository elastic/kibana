/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { EuiFieldText, EuiSpacer } from '@elastic/eui';
import uuid from 'uuid';

import { Ecs } from '../../../../../../../common/ecs';
import {
  ExceptionBuilderComponent,
  OnChangeProps as OnChangeBuilderProps,
} from '../../../../../../common/components/exceptions/builder';
import { ExceptionsBuilderExceptionItem } from '../../../../../../common/components/exceptions/types';
import { AddExceptionComments } from '../../../../../../common/components/exceptions/add_exception_comments';
import { Loader } from '../../../../../../common/components/loader';
import { useKibana } from '../../../../../../common/lib/kibana';
import { useFetchIndex } from '../../../../../../common/containers/source';
import { addIdToItem } from '../../../../../../../common';
import {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '../../../../../../../public/shared_imports';

export interface OnChangeProps {
  items: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>;
  hasError: boolean;
  name: string;
  comment: string;
}

export interface EventFilteringFormProps {
  eventData: Ecs;
  onFormChange(arg: OnChangeProps): void;
}

export const EventFilteringForm: React.FC<EventFilteringFormProps> = memo(
  ({ eventData, onFormChange }) => {
    const { http, data } = useKibana().services;
    const [isIndexPatternLoading, { indexPatterns }] = useFetchIndex(['logs-endpoint.events.*']);
    const [items, setItems] = useState<
      Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
    >([]);
    const [name, setName] = useState<string>('');
    const [hasNameError, setHasNameError] = useState(!name);
    const [hasItemsError, setHasItemsError] = useState(false);
    const [comment, setComment] = useState<string>('');

    const initialExceptionListItems: ExceptionsBuilderExceptionItem[] = useMemo(
      () => [
        {
          comments: [],
          description: `Endpoint Event Filtering - exception list item`,
          entries:
            eventData.event && eventData.process
              ? [
                  addIdToItem({
                    field: 'event.category',
                    operator: 'included',
                    type: 'match',
                    value: (eventData.event.category ?? [])[0],
                  }),
                  addIdToItem({
                    field: 'process.executable',
                    operator: 'included',
                    type: 'match',
                    value: (eventData.process.executable ?? [])[0],
                  }),
                ]
              : [],
          item_id: undefined,
          list_id: '',
          meta: {
            temporaryUuid: uuid.v4(),
          },
          name: `Endpoint Event Filtering - exception list item`,
          namespace_type: 'agnostic',
          tags: [],
          type: 'simple',
        },
      ],
      [eventData]
    );

    const handleOnBuilderChange = useCallback((arg: OnChangeBuilderProps) => {
      setItems(arg.exceptionItems);
      setHasItemsError(arg.errorExists);
    }, []);

    const handleOnChangeName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
      setHasNameError(!e.target.value);
    }, []);

    useEffect(() => {
      onFormChange({ items, hasError: hasNameError || hasItemsError, name, comment });
    }, [items, name, comment, onFormChange, hasNameError, hasItemsError]);

    const exceptionBuilderComponentMemo = useMemo(
      () => (
        <>
          <ExceptionBuilderComponent
            httpService={http}
            autocompleteService={data.autocomplete}
            exceptionListItems={initialExceptionListItems}
            listType={'endpoint'}
            listId={''}
            listNamespaceType={'agnostic'}
            ruleName={'Endpoint Event Filtering'}
            indexPatterns={indexPatterns}
            isOrDisabled={false}
            isAndDisabled={false}
            isNestedDisabled={false}
            data-test-subj="alert-exception-builder"
            id-aria="alert-exception-builder"
            onChange={handleOnBuilderChange}
          />
          <EuiSpacer />
        </>
      ),
      [data, handleOnBuilderChange, http, indexPatterns, initialExceptionListItems]
    );

    const nameInputMemo = useMemo(
      () => (
        <>
          <EuiFieldText
            placeholder="Event exception name"
            value={name}
            onChange={handleOnChangeName}
            fullWidth
            aria-label="Event exception name"
          />
          <EuiSpacer />
        </>
      ),
      [name, handleOnChangeName]
    );

    const commentsInputMemo = useMemo(
      () => <AddExceptionComments newCommentValue={comment} newCommentOnChange={setComment} />,
      [comment, setComment]
    );

    return !isIndexPatternLoading ? (
      <>
        {nameInputMemo}
        {exceptionBuilderComponentMemo}
        {commentsInputMemo}
      </>
    ) : (
      <Loader size="xl" />
    );
  }
);

EventFilteringForm.displayName = 'EventFilteringForm';
