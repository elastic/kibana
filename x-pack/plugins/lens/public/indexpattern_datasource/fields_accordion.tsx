/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './datapanel.scss';
import React, { memo, useCallback } from 'react';
import {
  EuiText,
  EuiNotificationBadge,
  EuiSpacer,
  EuiAccordion,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { IndexPatternField } from './types';
import { FieldItem } from './field_item';
import { Query, Filter } from '../../../../../src/plugins/data/public';
import { DatasourceDataPanelProps } from '../types';
import { IndexPattern } from './types';

export interface FieldItemSharedProps {
  core: DatasourceDataPanelProps['core'];
  data: DataPublicPluginStart;
  indexPattern: IndexPattern;
  highlight?: string;
  query: Query;
  dateRange: DatasourceDataPanelProps['dateRange'];
  filters: Filter[];
}

export interface FieldsAccordionProps {
  initialIsOpen: boolean;
  onToggle: (open: boolean) => void;
  id: string;
  label: string;
  hasLoaded: boolean;
  fieldsCount: number;
  isFiltered: boolean;
  paginatedFields: IndexPatternField[];
  fieldProps: FieldItemSharedProps;
  renderCallout: JSX.Element;
  exists: boolean;
}

export const InnerFieldsAccordion = function InnerFieldsAccordion({
  initialIsOpen,
  onToggle,
  id,
  label,
  hasLoaded,
  fieldsCount,
  isFiltered,
  paginatedFields,
  fieldProps,
  renderCallout,
  exists,
}: FieldsAccordionProps) {
  const renderField = useCallback(
    (field: IndexPatternField) => {
      return <FieldItem {...fieldProps} key={field.name} field={field} exists={!!exists} />;
    },
    [fieldProps, exists]
  );

  return (
    <EuiAccordion
      initialIsOpen={initialIsOpen}
      onToggle={onToggle}
      data-test-subj={id}
      id={id}
      buttonContent={
        <EuiText size="xs">
          <strong>{label}</strong>
        </EuiText>
      }
      extraAction={
        hasLoaded ? (
          <EuiNotificationBadge size="m" color={isFiltered ? 'accent' : 'subdued'}>
            {fieldsCount}
          </EuiNotificationBadge>
        ) : (
          <EuiLoadingSpinner size="m" />
        )
      }
    >
      <EuiSpacer size="s" />
      {hasLoaded &&
        (!!fieldsCount ? (
          <div className="lnsInnerIndexPatternDataPanel__fieldItems">
            {paginatedFields && paginatedFields.map(renderField)}
          </div>
        ) : (
          renderCallout
        ))}
    </EuiAccordion>
  );
};

export const FieldsAccordion = memo(InnerFieldsAccordion);
