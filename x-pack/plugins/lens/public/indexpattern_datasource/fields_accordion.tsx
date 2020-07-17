/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './datapanel.scss';
import React, { memo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiText,
  EuiNotificationBadge,
  EuiSpacer,
  EuiAccordion,
  EuiLoadingSpinner,
  EuiIconTip,
} from '@elastic/eui';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { IndexPatternField } from './types';
import { FieldItem } from './field_item';
import { Query, Filter } from '../../../../../src/plugins/data/public';
import { DatasourceDataPanelProps } from '../types';
import { IndexPattern } from './types';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';

export interface FieldItemSharedProps {
  core: DatasourceDataPanelProps['core'];
  data: DataPublicPluginStart;
  chartsThemeService: ChartsPluginSetup['theme'];
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
  showExistenceFetchError?: boolean;
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
  showExistenceFetchError,
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
        showExistenceFetchError ? (
          <EuiIconTip
            aria-label={i18n.translate('xpack.lens.indexPattern.existenceErrorAriaLabel', {
              defaultMessage: 'Existence fetch failed',
            })}
            type="alert"
            color="warning"
            content={i18n.translate('xpack.lens.indexPattern.existenceErrorLabel', {
              defaultMessage: "Field information can't be loaded",
            })}
          />
        ) : hasLoaded ? (
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
