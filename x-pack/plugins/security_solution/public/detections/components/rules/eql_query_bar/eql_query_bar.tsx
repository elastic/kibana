/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, ChangeEvent, useEffect, useState } from 'react';
import { Subscription } from 'rxjs';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';
import { EuiFormRow, EuiSpacer, EuiTextArea } from '@elastic/eui';
import type { DataViewBase, Filter, Query } from '@kbn/es-query';
import { FilterManager } from '@kbn/data-plugin/public';

import { FieldHook } from '../../../../shared_imports';
import { FilterBar } from '../../../../common/components/filter_bar';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { DefineStepRule } from '../../../pages/detection_engine/rules/types';
import * as i18n from './translations';
import { EqlQueryBarFooter } from './footer';
import { getValidationResults } from './validators';
import {
  EqlOptionsData,
  EqlOptionsSelected,
  FieldsEqlOptions,
} from '../../../../../common/search_strategy';
import { useKibana } from '../../../../common/lib/kibana';

const TextArea = styled(EuiTextArea)`
  display: block;
  border: ${({ theme }) => theme.eui.euiBorderThin};
  border-bottom: 0;
  box-shadow: none;
  min-height: ${({ theme }) => theme.eui.euiFormControlHeight};
`;

export interface FieldValueQueryBar {
  filters: Filter[];
  query: Query;
  saved_id?: string;
}

export interface EqlQueryBarProps {
  dataTestSubj: string;
  field: FieldHook<DefineStepRule['queryBar']>;
  isLoading: boolean;
  indexPattern: DataViewBase;
  showFilterBar?: boolean;
  idAria?: string;
  optionsData?: EqlOptionsData;
  optionsSelected?: EqlOptionsSelected;
  onOptionsChange?: (field: FieldsEqlOptions, newValue: string | null) => void;
  onValidityChange?: (arg: boolean) => void;
  onValiditingChange?: (arg: boolean) => void;
}

export const EqlQueryBar: FC<EqlQueryBarProps> = ({
  dataTestSubj,
  field,
  isLoading = false,
  indexPattern,
  showFilterBar,
  idAria,
  optionsData,
  optionsSelected,
  onOptionsChange,
  onValidityChange,
  onValiditingChange,
}) => {
  const { addError } = useAppToasts();
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const {
    isValidating,
    value: fieldValue,
    setValue: setFieldValue,
  } = field as FieldHook<FieldValueQueryBar>;
  const { isValid, message, messages, error } = getValidationResults(field);

  const { uiSettings } = useKibana().services;
  const [filterManager] = useState<FilterManager>(new FilterManager(uiSettings));

  // Bubbles up field validity to parent.
  // Using something like form `getErrors` does
  // not guarantee latest validity state
  useEffect(() => {
    if (onValidityChange != null) {
      onValidityChange(isValid);
    }
  }, [isValid, onValidityChange]);

  useEffect(() => {
    setErrorMessages(messages ?? []);
  }, [messages]);

  useEffect(() => {
    if (error) {
      addError(error, { title: i18n.EQL_VALIDATION_REQUEST_ERROR });
    }
  }, [error, addError]);

  useEffect(() => {
    if (onValiditingChange) {
      onValiditingChange(isValidating);
    }
  }, [isValidating, onValiditingChange]);

  useEffect(() => {
    let isSubscribed = true;
    const subscriptions = new Subscription();
    filterManager.setFilters([]);

    subscriptions.add(
      filterManager.getUpdates$().subscribe({
        next: () => {
          if (isSubscribed) {
            const newFilters = filterManager.getFilters();
            const { filters } = fieldValue;

            if (!deepEqual(filters, newFilters)) {
              setFieldValue({ ...fieldValue, filters: newFilters });
            }
          }
        },
      })
    );

    return () => {
      isSubscribed = false;
      subscriptions.unsubscribe();
    };
  }, [fieldValue, filterManager, setFieldValue]);

  useEffect(() => {
    const { filters } = fieldValue;
    if (!deepEqual(filters, filterManager.getFilters())) {
      filterManager.setFilters(filters);
    }
  }, [fieldValue, filterManager]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newQuery = e.target.value;
      if (onValiditingChange) {
        onValiditingChange(true);
      }
      setErrorMessages([]);
      setFieldValue({
        filters: fieldValue.filters,
        query: {
          query: newQuery,
          language: 'eql',
        },
      });
    },
    [fieldValue, setFieldValue, onValiditingChange]
  );

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={field.helpText}
      error={message}
      isInvalid={!isValid && !isValidating}
      fullWidth
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
    >
      <>
        <TextArea
          data-test-subj="eqlQueryBarTextInput"
          fullWidth
          isInvalid={!isValid && !isValidating}
          value={fieldValue.query.query as string}
          onChange={handleChange}
        />
        <EqlQueryBarFooter
          errors={errorMessages}
          isLoading={isValidating}
          optionsData={optionsData}
          optionsSelected={optionsSelected}
          onOptionsChange={onOptionsChange}
        />
        {showFilterBar && (
          <>
            <EuiSpacer size="s" />
            <FilterBar
              indexPattern={indexPattern}
              isLoading={isLoading}
              isRefreshPaused={false}
              filterQuery={fieldValue.query}
              filterManager={filterManager}
              filters={filterManager.getFilters() || []}
              displayStyle="inPage"
            />
          </>
        )}
      </>
    </EuiFormRow>
  );
};
