/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { fromKueryExpression, Query, TimeRange, toElasticsearchQuery } from '@kbn/es-query';
import { kqlQuerySchema, kqlWithFiltersSchema } from '@kbn/slo-schema';
import React, { memo } from 'react';
import styled from 'styled-components';
import { observabilityAppId } from '@kbn/observability-shared-plugin/common';
import { SearchBarProps } from './query_builder';
import { useKibana } from '../../../../utils/kibana_react';
import { CreateSLOForm } from '../../types';
import { OptionalText } from './optional_text';

export const QuerySearchBar = memo(
  ({
    isFlyoutOpen,
    name,
    label,
    dataView,
    required,
    tooltip,
    dataTestSubj,
    placeholder,
    range,
    setRange,
  }: SearchBarProps & {
    isFlyoutOpen?: boolean;
    range: TimeRange;
    setRange: (range: TimeRange) => void;
  }) => {
    const { SearchBar } = useKibana().services.unifiedSearch.ui;

    const { control } = useFormContext<CreateSLOForm>();

    return (
      <Controller
        defaultValue=""
        name={name}
        control={control}
        rules={{
          required: Boolean(required) && Boolean(dataView),
          validate: (value) => {
            try {
              if (!dataView) return;
              if (typeof value === 'string') {
                const ast = fromKueryExpression(value);
                toElasticsearchQuery(ast, dataView);
              } else if (kqlWithFiltersSchema.is(value)) {
                const ast = fromKueryExpression(value.kqlQuery);
                toElasticsearchQuery(ast, dataView);
              }
            } catch (e) {
              return e.message;
            }
          },
        }}
        render={({ field, fieldState }) => {
          const handleQueryChange = (value?: Query, nRange?: TimeRange) => {
            if (isFlyoutOpen && nRange) {
              setRange(nRange);
            }
            if (kqlQuerySchema.is(field.value)) {
              field.onChange(String(value?.query));
            } else {
              field.onChange({
                ...(field.value ?? {}),
                kqlQuery: String(value?.query),
              });
            }
          };
          return (
            <EuiFormRow
              label={
                !!tooltip ? (
                  <span>
                    {label} {tooltip}
                  </span>
                ) : (
                  label
                )
              }
              labelAppend={!required ? <OptionalText /> : undefined}
              isInvalid={fieldState.invalid}
              error={fieldState.error?.message}
              fullWidth
            >
              <Container>
                <SearchBar
                  appName={observabilityAppId}
                  dataTestSubj={dataTestSubj}
                  indexPatterns={dataView ? [dataView] : []}
                  isDisabled={!dataView}
                  placeholder={placeholder}
                  query={{
                    query: kqlQuerySchema.is(field.value)
                      ? String(field.value)
                      : field.value.kqlQuery,
                    language: 'kuery',
                  }}
                  // we rely on submit button to submit the form when the flyout is open
                  onQueryChange={
                    isFlyoutOpen
                      ? undefined
                      : (value) => handleQueryChange(value.query, value.dateRange)
                  }
                  onQuerySubmit={(value) => handleQueryChange(value.query, value.dateRange)}
                  onFiltersUpdated={(filters) => {
                    if (kqlQuerySchema.is(field.value)) {
                      field.onChange({
                        filters,
                        kqlQuery: field.value,
                      });
                    } else {
                      field.onChange({
                        ...(field.value ?? {}),
                        filters,
                      });
                    }
                  }}
                  onSavedQueryUpdated={(savedQuery) => {
                    field.onChange({
                      filters: savedQuery.attributes.filters,
                      kqlQuery: String(savedQuery.attributes.query.query),
                    });
                  }}
                  dateRangeFrom={range.from}
                  dateRangeTo={range.to}
                  onTimeRangeChange={(nRange) => {
                    setRange(nRange.dateRange);
                  }}
                  showDatePicker={isFlyoutOpen}
                  showSubmitButton={isFlyoutOpen}
                  showQueryInput={true}
                  disableQueryLanguageSwitcher={true}
                  onClearSavedQuery={() => {}}
                  filters={kqlQuerySchema.is(field.value) ? [] : field.value?.filters ?? []}
                />
              </Container>
            </EuiFormRow>
          );
        }}
      />
    );
  }
);

const Container = styled.div`
  .uniSearchBar {
    padding: 0;
  }
`;
