/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import React, { ReactNode, useMemo, useState } from 'react';
import { Controller, FieldPath, useFormContext } from 'react-hook-form';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import styled from 'styled-components';
import { kqlQuerySchema } from '@kbn/slo-schema';
import { Query, TimeRange } from '@kbn/es-query';
import { observabilityAppId } from '../../../../../common';
import { QueryDocumentsFlyout } from './query_documents_flyout';
import { useCreateDataView } from '../../../../hooks/use_create_data_view';
import { useKibana } from '../../../../utils/kibana_react';
import { CreateSLOForm } from '../../types';
import { OptionalText } from './optional_text';

export interface Props {
  dataTestSubj: string;
  indexPatternString: string | undefined;
  label: string;
  name: FieldPath<CreateSLOForm>;
  placeholder: string;
  required?: boolean;
  tooltip?: ReactNode;
}

export function QueryBuilder({
  dataTestSubj,
  indexPatternString,
  label,
  name,
  placeholder,
  required,
  tooltip,
}: Props) {
  const { SearchBar } = useKibana().services.unifiedSearch.ui;
  const { control, getFieldState, watch } = useFormContext<CreateSLOForm>();
  const filterValue = watch(name);
  const { dataView } = useCreateDataView({
    indexPatternString,
  });

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [range, setRange] = useState({ from: 'now-15m', to: 'now' });

  const searchBar = useMemo(
    () => (
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
        isInvalid={getFieldState(name).invalid}
        error={getFieldState(name).error?.message}
        fullWidth
      >
        <Controller
          defaultValue=""
          name={name}
          control={control}
          rules={{
            required: Boolean(required) && Boolean(dataView),
            validate: (value) => {
              try {
                if (!dataView) return;
                const ast = fromKueryExpression(String(value));
                toElasticsearchQuery(ast, dataView);
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
                  onQueryChange={(value) => handleQueryChange(value.query, value.dateRange)}
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
                  showSubmitButton={false}
                  showQueryInput={true}
                  disableQueryLanguageSwitcher={true}
                  onClearSavedQuery={() => {}}
                  filters={kqlQuerySchema.is(field.value) ? [] : field.value?.filters ?? []}
                />
              </Container>
            );
          }}
        />
      </EuiFormRow>
    ),
    [
      tooltip,
      label,
      required,
      getFieldState,
      name,
      control,
      dataView,
      SearchBar,
      dataTestSubj,
      placeholder,
      range.from,
      range.to,
      isFlyoutOpen,
    ]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>{searchBar}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            css={{ marginTop: 27 }}
            isDisabled={!Boolean(dataView)}
            data-test-subj="o11yQueryBuilderButton"
            iconType="documents"
            onClick={() => setIsFlyoutOpen(true)}
            aria-label={i18n.translate('xpack.observability.queryBuilder.documentsButtonLabel', {
              defaultMessage: 'View documents',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isFlyoutOpen && dataView && (
        <QueryDocumentsFlyout
          range={range}
          filter={filterValue}
          setIsFlyoutOpen={setIsFlyoutOpen}
          searchBar={searchBar}
          dataView={dataView}
          name={name}
        />
      )}
    </>
  );
}

const Container = styled.div`
  .uniSearchBar {
    padding: 0;
  }
`;
