/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { EuiFieldText, EuiSpacer } from '@elastic/eui';

import { isEmpty } from 'lodash';
import {
  ExceptionBuilderComponent,
  OnChangeProps as OnChangeBuilderProps,
} from '../../../../../../common/components/exceptions/builder';
import { AddExceptionComments } from '../../../../../../common/components/exceptions/add_exception_comments';
import { Loader } from '../../../../../../common/components/loader';
import { useKibana } from '../../../../../../common/lib/kibana';
import { useFetchIndex } from '../../../../../../common/containers/source';
import { AppAction } from '../../../../../../common/store/actions';
import {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '../../../../../../../public/shared_imports';

import { useEventFiltersSelector } from '../../hooks';
import { getFormEntry } from '../../../store/selector';

export const EventFilteringForm: React.FC = memo(() => {
  const { http, data } = useKibana().services;
  const dispatch = useDispatch<Dispatch<AppAction>>();
  const exception = useEventFiltersSelector(getFormEntry);

  const [isIndexPatternLoading, { indexPatterns }] = useFetchIndex(['logs-endpoint.events.*']);
  const [item, setItem] = useState<ExceptionListItemSchema | CreateExceptionListItemSchema>();
  const [name, setName] = useState<string>('');
  const [hasNameError, setHasNameError] = useState(!name);
  const [hasItemsError, setHasItemsError] = useState(false);
  const [comment, setComment] = useState<string>('');

  const handleOnBuilderChange = useCallback((arg: OnChangeBuilderProps) => {
    if (isEmpty(arg.exceptionItems)) return;
    setItem(arg.exceptionItems[0]);
    setHasItemsError(arg.errorExists);
  }, []);

  const handleOnChangeName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setHasNameError(!e.target.value);
  }, []);

  useEffect(() => {
    if (item)
      dispatch({
        type: 'eventFilterChangeForm',
        payload: { entry: { ...item, name }, hasError: hasNameError || hasItemsError },
      });
  }, [item, name, comment, hasNameError, hasItemsError, dispatch]);

  const exceptionBuilderComponentMemo = useMemo(
    () => (
      <>
        <ExceptionBuilderComponent
          httpService={http}
          autocompleteService={data.autocomplete}
          exceptionListItems={[exception as ExceptionListItemSchema]}
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
    [data, handleOnBuilderChange, http, indexPatterns, exception]
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

  return !isIndexPatternLoading && exception ? (
    <>
      {nameInputMemo}
      {exceptionBuilderComponentMemo}
      {commentsInputMemo}
    </>
  ) : (
    <Loader size="xl" />
  );
});

EventFilteringForm.displayName = 'EventFilteringForm';
