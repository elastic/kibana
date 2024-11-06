/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isEqual } from 'lodash';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { css } from '@emotion/css';
import type { DataViewBase } from '@kbn/es-query';

import type { EqlOptions, FieldsEqlOptions } from '../../../../../../common/search_strategy';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { SourcererScopeName } from '../../../../../sourcerer/store/model';
import { EqlQueryEdit } from '../../../../../detection_engine/rule_creation_ui/components/eql_query_edit';
import type { FieldValueQueryBar } from '../../../../../detection_engine/rule_creation_ui/components/query_bar';

import type { FormSchema } from '../../../../../shared_imports';
import { Form, UseField, useForm, useFormData } from '../../../../../shared_imports';
import { timelineActions } from '../../../../store';
import { getEqlOptions } from './selectors';

interface TimelineEqlQueryBar {
  index: string[];
  eqlQueryBar: FieldValueQueryBar;
  eqlOptions: EqlOptions;
}

const defaultValues = {
  index: [],
  eqlQueryBar: {
    query: { query: '', language: 'eql' },
    filters: [],
    saved_id: null,
  },
  eqlOptions: {},
};

const schema: FormSchema<TimelineEqlQueryBar> = {
  index: {
    fieldsToValidateOnChange: ['index', 'eqlQueryBar'],
    validations: [],
  },
  eqlOptions: {
    fieldsToValidateOnChange: ['eqlOptions', 'eqlQueryBar'],
  },
};

const hiddenUseFieldClassName = css`
  display: none;
`;

// eslint-disable-next-line react/display-name
export const EqlQueryBarTimeline = memo(({ timelineId }: { timelineId: string }) => {
  const dispatch = useDispatch();
  const isInit = useRef(true);
  const [isQueryBarValid, setIsQueryBarValid] = useState(false);
  const [isQueryBarValidating, setIsQueryBarValidating] = useState(false);
  const getOptionsSelected = useMemo(() => getEqlOptions(), []);
  const optionsSelected = useDeepEqualSelector((state) => getOptionsSelected(state, timelineId));

  const {
    loading: indexPatternsLoading,
    sourcererDataView,
    selectedPatterns,
  } = useSourcererDataView(SourcererScopeName.timeline);

  const initialState = useMemo(
    () => ({
      ...defaultValues,
      index: [...selectedPatterns].sort(),
      eqlQueryBar: {
        ...defaultValues.eqlQueryBar,
        query: { query: optionsSelected.query ?? '', language: 'eql' },
      },
    }),
    [optionsSelected.query, selectedPatterns]
  );

  const { form } = useForm<TimelineEqlQueryBar>({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });
  const { getFields, setFieldValue } = form;

  const onOptionsChange = useCallback(
    (field: FieldsEqlOptions, value: string | undefined) => {
      dispatch(
        timelineActions.updateEqlOptions({
          id: timelineId,
          field,
          value,
        })
      );
      setFieldValue('eqlOptions', { ...optionsSelected, [field]: value });
    },
    [dispatch, optionsSelected, setFieldValue, timelineId]
  );

  const [{ eqlQueryBar: formEqlQueryBar }] = useFormData<TimelineEqlQueryBar>({
    form,
    watch: ['eqlQueryBar'],
  });

  const prevEqlQuery = useRef<TimelineEqlQueryBar['eqlQueryBar']['query']['query']>('');

  const eqlFieldsComboBoxOptions = useMemo(() => {
    const fields = Object.values(sourcererDataView.fields || {});

    return isEmpty(fields)
      ? {
          keywordFields: [],
          dateFields: [],
          nonDateFields: [],
        }
      : {
          keywordFields: fields
            .filter((f) => f.esTypes?.includes('keyword'))
            .map((f) => ({ label: f.name })),
          dateFields: fields.filter((f) => f.type === 'date').map((f) => ({ label: f.name })),
          nonDateFields: fields.filter((f) => f.type !== 'date').map((f) => ({ label: f.name })),
        };
  }, [sourcererDataView]);

  useEffect(() => {
    const { index: indexField } = getFields();
    const newIndexValue = [...selectedPatterns].sort();
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
      prevEqlQuery.current !== formEqlQueryBar.query.query &&
      isQueryBarValid &&
      !isQueryBarValidating
    ) {
      prevEqlQuery.current = formEqlQueryBar.query.query;
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

  /* Force casting `sourcererDataView` to `DataViewBase` is required since EqlQueryEdit
     accepts DataViewBase but `useSourcererDataView()` returns `DataViewSpec`.
     
     When using `UseField` with `EqlQueryBar` such casting isn't required by TS since
     `UseField` component props are types as `Record<string, any>`. */
  return (
    <Form form={form} data-test-subj="EqlQueryBarTimeline">
      <UseField key="Index" path="index" className={hiddenUseFieldClassName} />
      <UseField key="EqlOptions" path="eqlOptions" className={hiddenUseFieldClassName} />
      <EqlQueryEdit
        key="EqlQueryBar"
        path="eqlQueryBar"
        eqlFieldsComboBoxOptions={eqlFieldsComboBoxOptions}
        eqlOptions={optionsSelected}
        showEqlSizeOption
        dataView={sourcererDataView as unknown as DataViewBase}
        loading={indexPatternsLoading}
        disabled={indexPatternsLoading}
        onValidityChange={setIsQueryBarValid}
        onValiditingChange={setIsQueryBarValidating}
        onEqlOptionsChange={onOptionsChange}
      />
    </Form>
  );
});
