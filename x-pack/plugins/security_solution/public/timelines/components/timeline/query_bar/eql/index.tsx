/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEmpty, isEqual } from 'lodash';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { FieldsEqlOptions } from '../../../../../../common/search_strategy';
import { useSourcererScope } from '../../../../../common/containers/sourcerer';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { KueryFilterQueryKind } from '../../../../../common/store';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';
import { EqlQueryBar } from '../../../../../detections/components/rules/eql_query_bar';

import {
  debounceAsync,
  eqlValidator,
} from '../../../../../detections/components/rules/eql_query_bar/validators';
import { FieldValueQueryBar } from '../../../../../detections/components/rules/query_bar';

import { Form, FormSchema, UseField, useForm, useFormData } from '../../../../../shared_imports';
import { timelineActions } from '../../../../store/timeline';
import * as i18n from '../translations';
import { getEqlOptions } from './selectors';

interface TimelineEqlQueryBar {
  index: string[];
  eqlQueryBar: FieldValueQueryBar;
}

const defaultValues = {
  index: [],
  eqlQueryBar: {
    query: { query: '', language: 'eql' },
    filters: [],
    saved_id: undefined,
  },
};

const schema: FormSchema<TimelineEqlQueryBar> = {
  index: {
    fieldsToValidateOnChange: ['index', 'eqlQueryBar'],
    validations: [],
  },
  eqlQueryBar: {
    validations: [
      {
        validator: debounceAsync(eqlValidator, 300),
      },
    ],
  },
};

const HiddenUseField = styled(UseField)`
  display: none;
`;

export const EqlQueryBarTimeline = memo(
  ({ expression, timelineId }: { expression: string; timelineId: string }) => {
    const dispatch = useDispatch();
    const [isQueryBarValid, setIsQueryBarValid] = useState(false);
    const [isQueryBarValidating, setIsQueryBarValidating] = useState(false);
    const getOptionsSelected = useMemo(() => getEqlOptions(), []);
    const optionsSelected = useDeepEqualSelector((state) => getOptionsSelected(state, timelineId));

    const { loading: indexPatternsLoading, indexPattern, selectedPatterns } = useSourcererScope(
      SourcererScopeName.timeline
    );

    const initialState = {
      ...defaultValues,
      index: selectedPatterns.sort(),
      eqlQueryBar: {
        ...defaultValues.eqlQueryBar,
        query: { query: expression, language: 'eql' },
      },
    };

    const { form } = useForm<TimelineEqlQueryBar>({
      defaultValue: initialState,
      options: { stripEmptyFields: false },
      schema,
    });
    const { getFields } = form;

    const applyLanguageFilterQuery = useCallback(
      (language: string) =>
        dispatch(
          timelineActions.applyKqlFilterQuery({
            id: timelineId,
            filterQuery: {
              kuery: {
                kind: language as KueryFilterQueryKind,
                expression: '',
              },
              serializedQuery: '',
            },
          })
        ),
      [dispatch, timelineId]
    );

    const onOptionsChange = useCallback(
      (field: FieldsEqlOptions, value: string | null) =>
        dispatch(
          timelineActions.updateEqlOptions({
            id: timelineId,
            field,
            value,
          })
        ),
      [dispatch, timelineId]
    );

    const [{ eqlQueryBar: formEqlQueryBar }] = useFormData<TimelineEqlQueryBar>({
      form,
      watch: ['eqlQueryBar'],
    });

    const optionsData = useMemo(
      () => ({
        keywordFields: indexPattern.fields
          .filter((f) => f.esTypes?.includes('keyword'))
          .map((f) => ({ label: f.name })),
        dateFields: indexPattern.fields
          .filter((f) => f.type === 'date')
          .map((f) => ({ label: f.name })),
        allFields: indexPattern.fields
          .filter((f) => f.type !== 'date')
          .map((f) => ({ label: f.name })),
      }),
      [indexPattern]
    );

    useEffect(() => {
      const { index: indexField } = getFields();
      const newIndexValue = selectedPatterns.sort();
      const indexFieldValue = (indexField.value as string[]).sort();
      if (!isEqual(indexFieldValue, newIndexValue)) {
        indexField.setValue(newIndexValue);
      }
    }, [getFields, selectedPatterns]);

    useEffect(() => {
      if (
        formEqlQueryBar != null &&
        !isEmpty(formEqlQueryBar.query.query.trim()) &&
        isQueryBarValid &&
        !isQueryBarValidating
      ) {
        dispatch(
          timelineActions.applyKqlFilterQuery({
            id: timelineId,
            filterQuery: {
              kuery: {
                kind: formEqlQueryBar.query.language as KueryFilterQueryKind,
                expression: formEqlQueryBar.query.query as string,
              },
              serializedQuery: '',
            },
          })
        );
        setIsQueryBarValid(false);
        setIsQueryBarValidating(false);
      }
    }, [dispatch, formEqlQueryBar, isQueryBarValid, isQueryBarValidating, timelineId]);

    return (
      <Form form={form} data-test-subj="EqlQueryBarTimeline">
        <HiddenUseField key="Index" path="index" />
        <UseField
          key="EqlQueryBar"
          path="eqlQueryBar"
          component={EqlQueryBar}
          componentProps={{
            optionsData,
            optionsSelected,
            onOptionsChange,
            onSelectLanguage: applyLanguageFilterQuery,
            onValidityChange: setIsQueryBarValid,
            onValiditingChange: setIsQueryBarValidating,
            idAria: 'timelineEqlQueryBar',
            isDisabled: indexPatternsLoading,
            isLoading: indexPatternsLoading,
            dataTestSubj: 'timelineEqlQueryBar',
          }}
          config={{
            ...schema.eqlQueryBar,
            label: i18n.EQL_QUERY_BAR_LABEL,
          }}
        />
      </Form>
    );
  }
);
