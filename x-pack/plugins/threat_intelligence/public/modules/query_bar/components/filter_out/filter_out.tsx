/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, VFC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiButtonIcon, EuiContextMenuItem } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import { ComponentType } from '../../../../../common/types/component_type';
import { useIndicatorsFiltersContext } from '../../../indicators/hooks/use_indicators_filters_context';
import { getIndicatorFieldAndValue } from '../../../indicators/lib/field_value';
import { FilterOut as FilterOutConst, updateFiltersArray } from '../../lib/filter';
import { EMPTY_VALUE } from '../../../../../common/constants';
import { Indicator } from '../../../../../common/types/indicator';
import { useStyles } from './styles';

const ICON_TYPE = 'minusInCircle';
const ICON_TITLE = i18n.translate('xpack.threatIntelligence.queryBar.filterOutButton', {
  defaultMessage: 'Filter Out',
});

export interface FilterOutProps {
  /**
   * Value used to filter in/out in the KQL bar. Used in combination with field if is type of {@link Indicator}.
   */
  data: Indicator | string;
  /**
   * Value used to filter in /out in the KQL bar.
   */
  field: string;
  /**
   * Dictates the way the FilterOut component is rendered depending on the situation in which it's used
   */
  type?: ComponentType;
  /**
   * Display component for when the FilterIn component is used within a DataGrid
   */
  as?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  /**
   * Used for unit and e2e tests.
   */
  ['data-test-subj']?: string;
}

/**
 * Retrieves the indicator's field and value, then creates a new {@link Filter} and adds it to the {@link FilterManager}.
 *
 * The component has 3 renders depending on where it's used: within a EuiContextMenu, a EuiDataGrid or not.
 *
 * @returns filter out button
 */
export const FilterOut: VFC<FilterOutProps> = ({ data, field, type, as: Component, ...props }) => {
  const styles = useStyles();

  const { filterManager } = useIndicatorsFiltersContext();

  const { key, value } =
    typeof data === 'string' ? { key: field, value: data } : getIndicatorFieldAndValue(data, field);

  const filterOut = useCallback(() => {
    const existingFilters: Filter[] = filterManager.getFilters();
    const newFilters: Filter[] = updateFiltersArray(existingFilters, key, value, FilterOutConst);
    filterManager.setFilters(newFilters);
  }, [filterManager, key, value]);

  if (!value || value === EMPTY_VALUE || !key) {
    return <></>;
  }

  if (type === ComponentType.EuiDataGrid) {
    return (
      <div {...props} css={styles.button}>
        {/* @ts-ignore*/}
        <Component aria-label={ICON_TITLE} iconType={ICON_TYPE} onClick={filterOut} />
      </div>
    );
  }

  if (type === ComponentType.ContextMenu) {
    return (
      <EuiContextMenuItem
        key="filterOut"
        icon="minusInCircle"
        size="s"
        onClick={filterOut}
        {...props}
      >
        Filter Out
      </EuiContextMenuItem>
    );
  }

  return (
    <EuiButtonIcon
      aria-label={ICON_TITLE}
      iconType={ICON_TYPE}
      iconSize="s"
      size="xs"
      color="primary"
      onClick={filterOut}
      {...props}
    />
  );
};
