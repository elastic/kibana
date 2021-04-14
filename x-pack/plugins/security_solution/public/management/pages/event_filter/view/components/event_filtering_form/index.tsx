/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import {
  EuiFieldText,
  EuiSpacer,
  EuiForm,
  EuiFormRow,
  EuiSuperSelect,
  EuiSuperSelectOption,
  EuiText,
} from '@elastic/eui';

import { isEmpty } from 'lodash';
import { OperatingSystem } from '../../../../../../../common/endpoint/types';
import { AddExceptionComments } from '../../../../../../common/components/exceptions/add_exception_comments';
import { filterIndexPatterns } from '../../../../../../common/components/exceptions/helpers';
import { Loader } from '../../../../../../common/components/loader';
import { useKibana } from '../../../../../../common/lib/kibana';
import { useFetchIndex } from '../../../../../../common/containers/source';
import { AppAction } from '../../../../../../common/store/actions';
import {
  ExceptionListItemSchema,
  ExceptionBuilder,
} from '../../../../../../../public/shared_imports';

import { useEventFilterSelector } from '../../hooks';
import { getFormEntry } from '../../../store/selector';
import {
  FORM_DESCRIPTION,
  NAME_LABEL,
  NAME_ERROR,
  NAME_PLACEHOLDER,
  OS_LABEL,
} from './translations';
import { OS_TITLES } from '../../../../../common/translations';
import { EVENT_FILTER_LIST_ID, EVENT_FILTER_LIST_TYPE } from '../../../constants';

const OPERATING_SYSTEMS: readonly OperatingSystem[] = [
  OperatingSystem.MAC,
  OperatingSystem.WINDOWS,
  OperatingSystem.LINUX,
];

interface EventFilteringFormProps {
  allowSelectOs?: boolean;
}
export const EventFilteringForm: React.FC<EventFilteringFormProps> = memo(
  ({ allowSelectOs = false }) => {
    const { http, data } = useKibana().services;
    const dispatch = useDispatch<Dispatch<AppAction>>();
    const exception = useEventFilterSelector(getFormEntry);

    const [isIndexPatternLoading, { indexPatterns }] = useFetchIndex(['logs-endpoint.events.*']);

    const osOptions: Array<EuiSuperSelectOption<OperatingSystem>> = useMemo(
      () => OPERATING_SYSTEMS.map((os) => ({ value: os, inputDisplay: OS_TITLES[os] })),
      []
    );

    const [hasNameError, setHasNameError] = useState(!exception || !exception.name);
    const [hasItemsError, setHasItemsError] = useState(false);
    const [comment, setComment] = useState<string>('');

    const handleOnBuilderChange = useCallback(
      (arg: ExceptionBuilder.OnChangeProps) => {
        if (isEmpty(arg.exceptionItems)) return;
        setHasItemsError(arg.errorExists);
        dispatch({
          type: 'eventFilterChangeForm',
          payload: { entry: arg.exceptionItems[0], hasError: hasNameError || hasItemsError },
        });
      },
      [dispatch, hasItemsError, hasNameError]
    );

    const handleOnChangeName = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!exception) return;
        setHasNameError(!e.target.value);
        dispatch({
          type: 'eventFilterChangeForm',
          payload: {
            entry: { ...exception, name: e.target.value.toString() },
            hasError: hasNameError || hasItemsError,
          },
        });
      },
      [dispatch, exception, hasItemsError, hasNameError]
    );

    const handleOnChangeComment = useCallback(
      (value: string) => {
        setComment(value);
        if (!exception) return;
        dispatch({
          type: 'eventFilterChangeForm',
          payload: {
            entry: { ...exception, comments: [{ comment: value }] },
          },
        });
      },
      [dispatch, exception, setComment]
    );

    const exceptionBuilderComponentMemo = useMemo(
      () => (
        <ExceptionBuilder.ExceptionBuilderComponent
          allowLargeValueLists
          httpService={http}
          autocompleteService={data.autocomplete}
          exceptionListItems={[exception as ExceptionListItemSchema]}
          listType={EVENT_FILTER_LIST_TYPE}
          listId={EVENT_FILTER_LIST_ID}
          listNamespaceType={'agnostic'}
          ruleName={'Endpoint Event Filtering'}
          indexPatterns={indexPatterns}
          isOrDisabled={false}
          isAndDisabled={false}
          isNestedDisabled={false}
          data-test-subj="alert-exception-builder"
          id-aria="alert-exception-builder"
          onChange={handleOnBuilderChange}
          listTypeSpecificIndexPatternFilter={filterIndexPatterns}
        />
      ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [data, handleOnBuilderChange, http, indexPatterns, exception?.entries]
    );

    const nameInputMemo = useMemo(
      () => (
        <EuiFormRow label={NAME_LABEL} fullWidth isInvalid={hasNameError} error={NAME_ERROR}>
          <EuiFieldText
            placeholder={NAME_PLACEHOLDER}
            defaultValue={exception?.name ?? ''}
            onChange={handleOnChangeName}
            fullWidth
            aria-label={NAME_PLACEHOLDER}
            required
            maxLength={256}
          />
        </EuiFormRow>
      ),
      [hasNameError, exception?.name, handleOnChangeName]
    );

    const osInputMemo = useMemo(
      () => (
        <EuiFormRow label={OS_LABEL} fullWidth>
          <EuiSuperSelect
            name="os"
            options={osOptions}
            valueOfSelected={
              exception?.os_types ? exception.os_types[0] : OS_TITLES[OperatingSystem.WINDOWS]
            }
            // TODO: To be implemented when adding update/create from scratch action
            // onChange={}}
          />
        </EuiFormRow>
      ),
      [exception?.os_types, osOptions]
    );

    const commentsInputMemo = useMemo(
      () => (
        <AddExceptionComments
          newCommentValue={comment}
          newCommentOnChange={handleOnChangeComment}
        />
      ),
      [comment, handleOnChangeComment]
    );

    return !isIndexPatternLoading && exception ? (
      <EuiForm component="div">
        <EuiText size="s">{FORM_DESCRIPTION}</EuiText>
        <EuiSpacer size="s" />
        {nameInputMemo}
        <EuiSpacer />
        {allowSelectOs ? (
          <>
            {osInputMemo}
            <EuiSpacer />
          </>
        ) : null}
        {exceptionBuilderComponentMemo}
        <EuiSpacer />
        {commentsInputMemo}
      </EuiForm>
    ) : (
      <Loader size="xl" />
    );
  }
);

EventFilteringForm.displayName = 'EventFilteringForm';
