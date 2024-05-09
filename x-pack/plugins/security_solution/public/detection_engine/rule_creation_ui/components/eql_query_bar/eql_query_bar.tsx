/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ChangeEvent } from 'react';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Subscription } from 'rxjs';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';
import { EuiFormRow, EuiSpacer, EuiTextArea } from '@elastic/eui';
import type { DataViewBase } from '@kbn/es-query';
import { FilterManager } from '@kbn/data-plugin/public';

import type { FieldHook } from '../../../../shared_imports';
import { FilterBar } from '../../../../common/components/filter_bar';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import * as i18n from './translations';
import { EqlQueryBarFooter } from './footer';
import { getValidationResults } from './validators';
import type {
  EqlOptionsData,
  EqlOptionsSelected,
  FieldsEqlOptions,
} from '../../../../../common/search_strategy';
import { useKibana } from '../../../../common/lib/kibana';

const TextArea = styled(EuiTextArea)`
  display: block;
  border: 0;
  box-shadow: none;
  border-radius: 0px;
  min-height: ${({ theme }) => theme.eui.euiFormControlHeight};
  &:focus {
    box-shadow: none;
  }
`;

const StyledFormRow = styled(EuiFormRow)`
  border: ${({ theme }) => theme.eui.euiBorderThin};
  border-radius: ${({ theme }) => theme.eui.euiBorderRadius};

  .euiFormRow__labelWrapper {
    background: ${({ theme }) => theme.eui.euiColorLightestShade};
    border-top-left-radius: ${({ theme }) => theme.eui.euiBorderRadius};
    border-top-right-radius: ${({ theme }) => theme.eui.euiBorderRadius};
    padding: 8px 10px;
    margin-bottom: 0px;
    label {
      color: ${({ theme }) => theme.eui.euiTextSubduedColor};
      &.euiFormLabel-isInvalid {
        color: ${({ theme }) => theme.eui.euiColorDangerText};
      }
    }
  }
`;

export interface EqlQueryBarProps {
  dataTestSubj: string;
  field: FieldHook<DefineStepRule['queryBar']>;
  isLoading: boolean;
  indexPattern: DataViewBase;
  showFilterBar?: boolean;
  idAria?: string;
  optionsData?: EqlOptionsData;
  optionsSelected?: EqlOptionsSelected;
  isSizeOptionDisabled?: boolean;
  onOptionsChange?: (field: FieldsEqlOptions, newValue: string | undefined) => void;
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
  isSizeOptionDisabled,
  onOptionsChange,
  onValidityChange,
  onValiditingChange,
}) => {
  const { addError } = useAppToasts();
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const { isValidating, value: fieldValue, setValue: setFieldValue } = field;
  const { isValid, message, messages, error } = getValidationResults(field);

  const { uiSettings } = useKibana().services;
  const filterManager = useRef<FilterManager>(new FilterManager(uiSettings));

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
    filterManager.current.setFilters([]);

    subscriptions.add(
      filterManager.current.getUpdates$().subscribe({
        next: () => {
          if (isSubscribed) {
            const newFilters = filterManager.current.getFilters();
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
    if (!deepEqual(filters, filterManager.current.getFilters())) {
      filterManager.current.setFilters(filters);
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
        saved_id: null,
      });
    },
    [fieldValue, setFieldValue, onValiditingChange]
  );

  return (
    <StyledFormRow
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
          isSizeOptionDisabled={isSizeOptionDisabled}
          optionsData={optionsData}
          optionsSelected={optionsSelected}
          onOptionsChange={onOptionsChange}
        />
        {showFilterBar && (
          <>
            <EuiSpacer size="s" />
            <FilterBar
              data-test-subj="eqlFilterBar"
              indexPattern={indexPattern}
              isLoading={isLoading}
              isRefreshPaused={false}
              filterQuery={fieldValue.query}
              filterManager={filterManager.current}
              filters={filterManager.current.getFilters() || []}
              displayStyle="inPage"
            />
          </>
        )}
      </>
    </StyledFormRow>
  );
};
