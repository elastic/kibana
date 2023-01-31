/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsServicePublicMethods, DataView } from '@kbn/data-views-plugin/common';
import React, { useState, useEffect } from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IndexPatternOverride, INDEX_PATTERN_INVALID } from '../../../../common/alerting/metrics';

interface IndexPatternFieldProps {
  label: string;
  helpText?: string;
  onChange: (indexPattern: IndexPatternOverride | undefined) => void;
  onDataViewChange: (dataView: DataView | undefined) => void;
  dataViewsService: DataViewsServicePublicMethods;
  value?: IndexPatternOverride;
}

interface IndexPatternFieldState {
  indexPattern: string | undefined;
  invalid: boolean;
  errors: string[];
  additionalHelpText: string;
}

const INITIAL_STATE = {
  invalid: false,
  errors: [],
  additionalHelpText: '',
  indexPattern: undefined,
};

export const IndexPatternField = ({
  onChange,
  onDataViewChange,
  label,
  helpText,
  value,
  dataViewsService,
}: IndexPatternFieldProps) => {
  const [state, setState] = useState<IndexPatternFieldState>({
    ...INITIAL_STATE,
    indexPattern: value !== INDEX_PATTERN_INVALID ? (value as string) : undefined,
  });

  useEffect(() => {
    async function fetchDataView() {
      if (state.indexPattern) {
        try {
          const dataView = await dataViewsService.create(
            { title: state.indexPattern },
            false, // fetches fields
            false // Supresses error notifications
          );
          setState((previous) => {
            return {
              ...previous,
              errors: [],
              invalid: false,
              additionalHelpText: i18n.translate(
                'xpack.infra.metrics.alertFlyout.indexPatternOverrideHelpText',
                {
                  defaultMessage: 'This pattern matches {count} indices.',
                  values: {
                    count: dataView.matchedIndices.length,
                  },
                }
              ),
            };
          });
          onChange(state.indexPattern);
          onDataViewChange(dataView);
        } catch (e) {
          setState((previous) => ({
            ...previous,
            errors: [e.message],
            invalid: true,
            additionalHelpText: '',
          }));
          onDataViewChange(undefined);
          onChange(INDEX_PATTERN_INVALID);
        }
      } else {
        setState(INITIAL_STATE);
        onChange(undefined);
        onDataViewChange(undefined);
      }
    }
    fetchDataView();
  }, [dataViewsService, onChange, onDataViewChange, state.indexPattern]);

  return (
    <EuiFormRow
      label={label}
      helpText={`${helpText}${state.additionalHelpText}`}
      isInvalid={state.invalid}
      fullWidth
      error={state.errors}
    >
      <EuiFieldText
        fullWidth
        isInvalid={state.invalid}
        value={state.indexPattern}
        onChange={(e) => setState((previous) => ({ ...previous, indexPattern: e.target.value }))}
      />
    </EuiFormRow>
  );
};
