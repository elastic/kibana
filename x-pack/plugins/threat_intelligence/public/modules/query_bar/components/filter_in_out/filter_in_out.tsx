/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, VFC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import { useIndicatorsFiltersContext } from '../../../indicators/hooks/use_indicators_filters_context';
import { getIndicatorFieldAndValue } from '../../../indicators/lib/field_value';
import { FilterIn, FilterOut, updateFiltersArray } from '../../lib/filter';
import { EMPTY_VALUE } from '../../../../../common/constants';
import { Indicator } from '../../../../../common/types/indicator';
import { useStyles } from './styles';

export const IN_ICON_TEST_ID = 'tiFilterInIcon';
export const OUT_ICON_TEST_ID = 'tiFilterOutIcon';
export const IN_COMPONENT_TEST_ID = 'tiFilterInComponent';
export const OUT_COMPONENT_TEST_ID = 'tiFilterOutComponent';

const IN_ICON_TYPE = 'plusInCircle';
const IN_ICON_TITLE = i18n.translate('xpack.threatIntelligence.queryBar.filterInButton', {
  defaultMessage: 'Filter In',
});
const OUT_ICON_TYPE = 'minusInCircle';
const OUT_ICON_TITLE = i18n.translate('xpack.threatIntelligence.queryBar.filterOutButton', {
  defaultMessage: 'Filter Out',
});

export interface FilterInOutProps {
  /**
   * Value used to filter in/out in the KQL bar. Used in combination with field if is type of {@link Indicator}.
   */
  data: Indicator | string;
  /**
   * Value used to filter in /out in the KQL bar.
   */
  field: string;
  /**
   * Display component for when the FilterIn component is used within a DataGrid
   */
  as?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
}

/**
 * Retrieves the indicator's field and value, then creates a new {@link Filter} and adds it to the {@link FilterManager}.
 */
export const FilterInOut: VFC<FilterInOutProps> = ({ data, field, as: Component }) => {
  const styles = useStyles();

  const { filterManager } = useIndicatorsFiltersContext();

  const { key, value } =
    typeof data === 'string' ? { key: field, value: data } : getIndicatorFieldAndValue(data, field);

  const filterIn = useCallback((): void => {
    const existingFilters = filterManager.getFilters();
    const newFilters: Filter[] = updateFiltersArray(existingFilters, key, value, FilterIn);
    filterManager.setFilters(newFilters);
  }, [filterManager, key, value]);

  const filterOut = useCallback(() => {
    const existingFilters: Filter[] = filterManager.getFilters();
    const newFilters: Filter[] = updateFiltersArray(existingFilters, key, value, FilterOut);
    filterManager.setFilters(newFilters);
  }, [filterManager, key, value]);

  if (!value || value === EMPTY_VALUE || !key) {
    return <></>;
  }

  return Component ? (
    <>
      <div data-test-subj={IN_COMPONENT_TEST_ID} css={styles.button}>
        <Component aria-label={IN_ICON_TITLE} iconType={IN_ICON_TYPE} onClick={filterIn} />
      </div>
      <div data-test-subj={OUT_COMPONENT_TEST_ID} css={styles.button}>
        <Component
          data-test-subj={IN_ICON_TEST_ID}
          aria-label={OUT_ICON_TITLE}
          iconType={OUT_ICON_TYPE}
          onClick={filterOut}
        />
      </div>
    </>
  ) : (
    <>
      <EuiButtonIcon
        data-test-subj={IN_ICON_TEST_ID}
        aria-label={IN_ICON_TITLE}
        iconType={IN_ICON_TYPE}
        iconSize="s"
        size="xs"
        color="primary"
        onClick={filterIn}
      />
      <EuiButtonIcon
        data-test-subj={OUT_ICON_TEST_ID}
        aria-label={OUT_ICON_TITLE}
        iconType={OUT_ICON_TYPE}
        iconSize="s"
        size="xs"
        color="primary"
        onClick={filterOut}
      />
    </>
  );
};
