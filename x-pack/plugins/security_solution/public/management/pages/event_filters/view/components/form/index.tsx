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
import { ExceptionListItemSchema, ExceptionBuilder } from '../../../../../../shared_imports';

import { useEventFiltersSelector } from '../../hooks';
import { getFormEntry } from '../../../store/selector';
import {
  FORM_DESCRIPTION,
  NAME_LABEL,
  NAME_ERROR,
  NAME_PLACEHOLDER,
  OS_LABEL,
  RULE_NAME,
} from './translations';
import { OS_TITLES } from '../../../../../common/translations';
import { ENDPOINT_EVENT_FILTERS_LIST_ID, EVENT_FILTER_LIST_TYPE } from '../../../constants';

const OPERATING_SYSTEMS: readonly OperatingSystem[] = [
  OperatingSystem.MAC,
  OperatingSystem.WINDOWS,
  OperatingSystem.LINUX,
];

interface EventFiltersFormProps {
  allowSelectOs?: boolean;
}
export const EventFiltersForm: React.FC<EventFiltersFormProps> = memo(
  ({ allowSelectOs = false }) => {
    const { http, data } = useKibana().services;
    const dispatch = useDispatch<Dispatch<AppAction>>();
    const exception = useEventFiltersSelector(getFormEntry);

    // This value has to be memoized to avoid infinite useEffect loop on useFetchIndex
    const indexNames = useMemo(() => ['logs-endpoint.events.*'], []);
    const [isIndexPatternLoading, { indexPatterns }] = useFetchIndex(indexNames);

    const osOptions: Array<EuiSuperSelectOption<OperatingSystem>> = useMemo(
      () => OPERATING_SYSTEMS.map((os) => ({ value: os, inputDisplay: OS_TITLES[os] })),
      []
    );

    const [hasNameError, setHasNameError] = useState(!exception || !exception.name);
    const [comment, setComment] = useState<string>('');

    const handleOnBuilderChange = useCallback(
      (arg: ExceptionBuilder.OnChangeProps) => {
        if (isEmpty(arg.exceptionItems)) return;
        dispatch({
          type: 'eventFiltersChangeForm',
          payload: {
            entry: {
              ...arg.exceptionItems[0],
              name: exception?.name ?? '',
              comments: exception?.comments ?? [],
              os_types: exception?.os_types ?? [OperatingSystem.WINDOWS],
            },
            hasItemsError: arg.errorExists || !arg.exceptionItems[0].entries.length,
          },
        });
      },
      [dispatch, exception?.name, exception?.comments, exception?.os_types]
    );

    const handleOnChangeName = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!exception) return;
        setHasNameError(!e.target.value);
        dispatch({
          type: 'eventFiltersChangeForm',
          payload: {
            entry: { ...exception, name: e.target.value.toString() },
            hasNameError: !e.target.value,
          },
        });
      },
      [dispatch, exception]
    );

    const handleOnChangeComment = useCallback(
      (value: string) => {
        setComment(value);
        if (!exception) return;
        dispatch({
          type: 'eventFiltersChangeForm',
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
          listId={ENDPOINT_EVENT_FILTERS_LIST_ID}
          listNamespaceType={'agnostic'}
          ruleName={RULE_NAME}
          indexPatterns={indexPatterns}
          isOrDisabled={true} // TODO: pending to be validated
          isAndDisabled={false}
          isNestedDisabled={false}
          data-test-subj="alert-exception-builder"
          id-aria="alert-exception-builder"
          onChange={handleOnBuilderChange}
          listTypeSpecificIndexPatternFilter={filterIndexPatterns}
        />
      ),
      [data, handleOnBuilderChange, http, indexPatterns, exception]
    );

    const nameInputMemo = useMemo(
      () => (
        <EuiFormRow label={NAME_LABEL} fullWidth isInvalid={hasNameError} error={NAME_ERROR}>
          <EuiFieldText
            id="eventFiltersFormInputName"
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
            fullWidth
            valueOfSelected={
              exception?.os_types ? exception.os_types[0] : OS_TITLES[OperatingSystem.WINDOWS]
            }
            onChange={(value) => {
              if (!exception) return;
              dispatch({
                type: 'eventFiltersChangeForm',
                payload: {
                  entry: {
                    ...exception,
                    os_types: [value as 'windows' | 'linux' | 'macos'],
                  },
                },
              });
            }}
          />
        </EuiFormRow>
      ),
      [dispatch, exception, osOptions]
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
        <EuiSpacer size="m" />
        {allowSelectOs ? (
          <>
            {osInputMemo}
            <EuiSpacer />
          </>
        ) : null}
        {exceptionBuilderComponentMemo}
        <EuiSpacer size="xl" />
        {commentsInputMemo}
      </EuiForm>
    ) : (
      <Loader size="xl" />
    );
  }
);

EventFiltersForm.displayName = 'EventFiltersForm';
