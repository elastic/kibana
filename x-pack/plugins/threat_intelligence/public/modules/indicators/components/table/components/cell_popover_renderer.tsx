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
import { CopyToClipboardButtonEmpty } from '../../copy_to_clipboard/copy_to_clipboard';
import { FilterInButtonEmpty, FilterOutButtonEmpty } from '../../../../query_bar';
import { AddToTimelineButtonEmpty } from '../../../../timeline';
import { fieldAndValueValid, getIndicatorFieldAndValue } from '../../../utils/field_value';
import { Indicator } from '../../../../../../common/types/indicator';
import { Pagination } from '../../../services/fetch_indicators';
import { useStyles } from './styles';

export const CELL_POPOVER_TIMELINE_BUTTON_TEST_ID = 'tiIndicatorsTableCellPopoverTimelineButton';
export const CELL_POPOVER_FILTER_IN_BUTTON_TEST_ID = 'tiIndicatorsTableCellPopoverFilterInButton';
export const CELL_POPOVER_FILTER_OUT_BUTTON_TEST_ID = 'tiIndicatorsTableCellPopoverFilterOutButton';

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
      return <></>;
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
