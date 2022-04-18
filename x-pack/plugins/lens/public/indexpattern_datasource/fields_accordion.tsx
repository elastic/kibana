/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './datapanel.scss';
import React, { memo, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiText,
  EuiNotificationBadge,
  EuiSpacer,
  EuiAccordion,
  EuiLoadingSpinner,
  EuiIconTip,
} from '@elastic/eui';
import classNames from 'classnames';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { Filter } from '@kbn/es-query';
import { Query } from '@kbn/data-plugin/public';
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { IndexPatternField } from './types';
import { FieldItem } from './field_item';
import { DatasourceDataPanelProps } from '../types';
import { IndexPattern } from './types';

export interface FieldItemSharedProps {
  core: DatasourceDataPanelProps['core'];
  fieldFormats: FieldFormatsStart;
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
  helpTooltip?: string;
  hasLoaded: boolean;
  fieldsCount: number;
  isFiltered: boolean;
  paginatedFields: IndexPatternField[];
  fieldProps: FieldItemSharedProps;
  renderCallout: JSX.Element;
  exists: (field: IndexPatternField) => boolean;
  showExistenceFetchError?: boolean;
  showExistenceFetchTimeout?: boolean;
  hideDetails?: boolean;
  groupIndex: number;
  dropOntoWorkspace: DatasourceDataPanelProps['dropOntoWorkspace'];
  hasSuggestionForField: DatasourceDataPanelProps['hasSuggestionForField'];
  editField?: (name: string) => void;
  removeField?: (name: string) => void;
  uiActions: UiActionsStart;
}

export const FieldsAccordion = memo(function InnerFieldsAccordion({
  initialIsOpen,
  onToggle,
  id,
  label,
  helpTooltip,
  hasLoaded,
  fieldsCount,
  isFiltered,
  paginatedFields,
  fieldProps,
  renderCallout,
  exists,
  hideDetails,
  showExistenceFetchError,
  showExistenceFetchTimeout,
  groupIndex,
  dropOntoWorkspace,
  hasSuggestionForField,
  editField,
  removeField,
  uiActions,
}: FieldsAccordionProps) {
  const renderField = useCallback(
    (field: IndexPatternField, index) => (
      <FieldItem
        {...fieldProps}
        key={field.name}
        field={field}
        exists={exists(field)}
        hideDetails={hideDetails}
        itemIndex={index}
        groupIndex={groupIndex}
        dropOntoWorkspace={dropOntoWorkspace}
        hasSuggestionForField={hasSuggestionForField}
        editField={editField}
        removeField={removeField}
        uiActions={uiActions}
      />
    ),
    [
      fieldProps,
      exists,
      hideDetails,
      dropOntoWorkspace,
      hasSuggestionForField,
      groupIndex,
      editField,
      removeField,
      uiActions,
    ]
  );

  const renderButton = useMemo(() => {
    const titleClassname = classNames({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      lnsInnerIndexPatternDataPanel__titleTooltip: !!helpTooltip,
    });
    return (
      <EuiText size="xs">
        <strong className={titleClassname}>{label}</strong>
        {!!helpTooltip && (
          <EuiIconTip
            aria-label={helpTooltip}
            type="questionInCircle"
            color="subdued"
            size="s"
            position="right"
            content={helpTooltip}
            iconProps={{
              className: 'eui-alignTop',
            }}
          />
        )}
      </EuiText>
    );
  }, [label, helpTooltip]);

  const extraAction = useMemo(() => {
    if (showExistenceFetchError) {
      return (
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
      );
    }
    if (showExistenceFetchTimeout) {
      return (
        <EuiIconTip
          aria-label={i18n.translate('xpack.lens.indexPattern.existenceTimeoutAriaLabel', {
            defaultMessage: 'Existence fetch timed out',
          })}
          type="clock"
          color="warning"
          content={i18n.translate('xpack.lens.indexPattern.existenceTimeoutLabel', {
            defaultMessage: 'Field information took too long',
          })}
        />
      );
    }
    if (hasLoaded) {
      return (
        <EuiNotificationBadge size="m" color={isFiltered ? 'accent' : 'subdued'}>
          {fieldsCount}
        </EuiNotificationBadge>
      );
    }

    return <EuiLoadingSpinner size="m" />;
  }, [showExistenceFetchError, showExistenceFetchTimeout, hasLoaded, isFiltered, fieldsCount]);

  return (
    <EuiAccordion
      initialIsOpen={initialIsOpen}
      onToggle={onToggle}
      data-test-subj={id}
      id={id}
      buttonContent={renderButton}
      extraAction={extraAction}
    >
      <EuiSpacer size="s" />
      {hasLoaded &&
        (!!fieldsCount ? (
          <ul className="lnsInnerIndexPatternDataPanel__fieldItems">
            {paginatedFields && paginatedFields.map(renderField)}
          </ul>
        ) : (
          renderCallout
        ))}
    </EuiAccordion>
  );
});
