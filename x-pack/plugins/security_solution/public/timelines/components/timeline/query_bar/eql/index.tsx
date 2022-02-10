/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isEqual } from 'lodash';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { FieldsEqlOptions } from '../../../../../../common/search_strategy';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
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

export const EqlQueryBarTimeline = memo(({ timelineId }: { timelineId: string }) => {
  const dispatch = useDispatch();
  const isInit = useRef(true);
  const [isQueryBarValid, setIsQueryBarValid] = useState(false);
  const [isQueryBarValidating, setIsQueryBarValidating] = useState(false);
  const getOptionsSelected = useMemo(() => getEqlOptions(), []);
  const optionsSelected = useDeepEqualSelector((state) => getOptionsSelected(state, timelineId));

  const {
    loading: indexPatternsLoading,
    indexPattern,
    selectedPatterns,
  } = useSourcererDataView(SourcererScopeName.timeline);

  const initialState = {
    ...defaultValues,
    index: selectedPatterns.sort(),
    eqlQueryBar: {
      ...defaultValues.eqlQueryBar,
      query: { query: optionsSelected.query ?? '', language: 'eql' },
    },
  };

  const { form } = useForm<TimelineEqlQueryBar>({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });
  const { getFields } = form;

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
    () =>
      isEmpty(indexPattern.fields)
        ? {
            keywordFields: [],
            dateFields: [],
            nonDateFields: [],
          }
        : {
            keywordFields: indexPattern.fields
              .filter((f) => f.esTypes?.includes('keyword'))
              .map((f) => ({ label: f.name })),
            dateFields: indexPattern.fields
              .filter((f) => f.type === 'date')
              .map((f) => ({ label: f.name })),
            nonDateFields: indexPattern.fields
              .filter((f) => f.type !== 'date')
              .map((f) => ({ label: f.name })),
          },
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
    const { eqlQueryBar } = getFields();
    if (isInit.current) {
      isInit.current = false;
      setIsQueryBarValidating(true);
      eqlQueryBar.setValue({
        ...defaultValues.eqlQueryBar,
        query: { query: optionsSelected.query ?? '', language: 'eql' },
      });
    }
    return () => {
      isInit.current = true;
    };
  }, [getFields, optionsSelected.query]);

  useEffect(() => {
    if (
      formEqlQueryBar != null &&
      !isEmpty(formEqlQueryBar.query.query) &&
      isQueryBarValid &&
      !isQueryBarValidating
    ) {
      dispatch(
        timelineActions.updateEqlOptions({
          id: timelineId,
          field: 'query',
          value: `${formEqlQueryBar.query.query}`,
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
});
