/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import type { EuiFieldNumberProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFormRow, EuiFieldNumber } from '@elastic/eui';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { css } from '@emotion/css';
import * as i18n from './translations';

interface ConcurrentSearchesAndItemsPerSearchProps {
  concurrentSearches: FieldHook;
  itemsPerSearch: FieldHook;
  isDisabled: boolean;
}

const NUMBER_FIELD_WIDTH = 200;

export const ConcurrentSearchesAndItemsPerSearch: React.FC<
  ConcurrentSearchesAndItemsPerSearchProps
> = ({ concurrentSearches, itemsPerSearch, isDisabled }): JSX.Element => {
  const [isConcurrentSearchesInvalid, concurrentSearchesError] = useMemo(() => {
    const value = concurrentSearches.value;
    if (typeof value === 'number' && !isNaN(value)) {
      if (value <= 0) {
        return [true, i18n.GREATER_THAN_ERROR];
      } else if (value * itemsPerSearch.value > 10000) {
        return [true, i18n.LESS_THAN_WARNING];
      }
    }
    return [false];
  }, [concurrentSearches.value, itemsPerSearch.value]);

  const [isItemsPerSearchInvalid, itemsPerSearchError] = useMemo(() => {
    const value = itemsPerSearch.value;
    if (typeof value === 'number' && !isNaN(value)) {
      if (value <= 0) {
        return [true, i18n.GREATER_THAN_ERROR];
      } else if (value * concurrentSearches.value > 10000) {
        return [true, i18n.LESS_THAN_WARNING];
      }
    }
    return [false];
  }, [concurrentSearches.value, itemsPerSearch.value]);

  const handleConcurrentSearchesChange: EuiFieldNumberProps['onChange'] = useCallback(
    (e) => {
      const concurrentSearchesValue = (e.target as HTMLInputElement).value;
      // Has to handle an empty string as the field is optional
      concurrentSearches.setValue(
        concurrentSearchesValue !== '' ? Number(concurrentSearchesValue.trim()) : ''
      );
    },
    [concurrentSearches]
  );

  const handleItemsPerSearchChange: EuiFieldNumberProps['onChange'] = useCallback(
    (e) => {
      const itemsPerSearchsValue = (e.target as HTMLInputElement).value;
      // Has to handle an empty string as the field is optional
      itemsPerSearch.setValue(
        itemsPerSearchsValue !== '' ? Number(itemsPerSearchsValue.trim()) : ''
      );
    },
    [itemsPerSearch]
  );

  return (
    <EuiFlexGroup>
      <EuiFormRow
        css={css`
          width: ${NUMBER_FIELD_WIDTH}px;
        `}
        describedByIds={['detectionEngineStepAboutConcurrentSearches']}
        // helpText={helpText}
        label={concurrentSearches.label}
        isInvalid={isConcurrentSearchesInvalid}
        error={concurrentSearchesError}
      >
        <EuiFieldNumber
          isInvalid={isConcurrentSearchesInvalid}
          value={concurrentSearches.value as EuiFieldNumberProps['value']}
          onChange={handleConcurrentSearchesChange}
          isLoading={concurrentSearches.isValidating}
          placeholder={'1'}
          data-test-subj="detectionEngineStepAboutConcurrentSearches"
          disabled={isDisabled}
        />
      </EuiFormRow>

      <EuiFormRow
        css={css`
          margin-top: 0 !important;
          width: ${NUMBER_FIELD_WIDTH}px;
        `}
        describedByIds={['detectionEngineStepAboutItemsPerSearch']}
        // helpText={helpText}
        label={itemsPerSearch.label}
        isInvalid={isItemsPerSearchInvalid}
        error={itemsPerSearchError}
      >
        <EuiFieldNumber
          isInvalid={isItemsPerSearchInvalid}
          value={itemsPerSearch.value as EuiFieldNumberProps['value']}
          onChange={handleItemsPerSearchChange}
          isLoading={itemsPerSearch.isValidating}
          placeholder={'9000'}
          data-test-subj="detectionEngineStepAboutItemsPerSearch"
          disabled={isDisabled}
        />
      </EuiFormRow>
    </EuiFlexGroup>
  );
};

ConcurrentSearchesAndItemsPerSearch.displayName = 'ConcurrentSearchesAndItemsPerSearch';
