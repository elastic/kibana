/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDataGridCellPopoverElementProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopoverTitle,
} from '@elastic/eui';
import React from 'react';
import { CopyToClipboardButtonEmpty } from '../common/copy_to_clipboard';
import { FilterInButtonEmpty } from '../../../query_bar/components/filter_in';
import { FilterOutButtonEmpty } from '../../../query_bar/components/filter_out';
import { AddToTimelineButtonEmpty } from '../../../timeline/components/add_to_timeline';
import { fieldAndValueValid, getIndicatorFieldAndValue } from '../../utils/field_value';
import { Indicator } from '../../../../../common/types/indicator';
import { Pagination } from '../../services/fetch_indicators';
import { useStyles } from './styles';
import {
  CELL_POPOVER_FILTER_IN_BUTTON_TEST_ID,
  CELL_POPOVER_FILTER_OUT_BUTTON_TEST_ID,
  CELL_POPOVER_TIMELINE_BUTTON_TEST_ID,
} from './test_ids';

/**
 * Used for the Indicators table cellActions column property.
 *
 * @param indicators array of {@link Indicator}
 * @param pagination information about table current page
 */
export const cellPopoverRendererFactory =
  (indicators: Indicator[], pagination: Pagination) =>
  (props: EuiDataGridCellPopoverElementProps) => {
    const styles = useStyles();

    const { rowIndex, columnId } = props;

    const indicator = indicators[rowIndex % pagination.pageSize];
    const { key, value } = getIndicatorFieldAndValue(indicator, columnId);
    if (!fieldAndValueValid(key, value)) {
      return null;
    }

    return (
      <>
        <EuiPopoverTitle paddingSize="m" css={styles.popoverMaxWidth}>
          {value}
        </EuiPopoverTitle>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem>
            <FilterInButtonEmpty
              data={indicator}
              field={key}
              data-test-subj={CELL_POPOVER_TIMELINE_BUTTON_TEST_ID}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <FilterOutButtonEmpty
              data={indicator}
              field={key}
              data-test-subj={CELL_POPOVER_FILTER_IN_BUTTON_TEST_ID}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem>
            <AddToTimelineButtonEmpty
              data={indicator}
              field={key}
              data-test-subj={CELL_POPOVER_FILTER_OUT_BUTTON_TEST_ID}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem>
            <CopyToClipboardButtonEmpty value={value as string} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  };
