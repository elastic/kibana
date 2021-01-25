/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  helpTooltip?: string;
  hasLoaded: boolean;
  fieldsCount: number;
  isFiltered: boolean;
  paginatedFields: IndexPatternField[];
  fieldProps: FieldItemSharedProps;
  renderCallout: JSX.Element;
  exists: (field: IndexPatternField) => boolean;
  showExistenceFetchError?: boolean;
  hideDetails?: boolean;
  groupIndex: number;
  dropOntoWorkspace: DatasourceDataPanelProps['dropOntoWorkspace'];
  hasSuggestionForField: DatasourceDataPanelProps['hasSuggestionForField'];
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
  groupIndex,
  dropOntoWorkspace,
  hasSuggestionForField,
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
      />
    ),
    [fieldProps, exists, hideDetails, dropOntoWorkspace, hasSuggestionForField, groupIndex]
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
    return showExistenceFetchError ? (
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
    );
  }, [showExistenceFetchError, hasLoaded, isFiltered, fieldsCount]);

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
