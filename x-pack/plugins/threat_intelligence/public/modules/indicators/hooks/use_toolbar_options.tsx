/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButtonIcon, EuiDataGridColumn, EuiText } from '@elastic/eui';
import { BrowserField } from '@kbn/rule-registry-plugin/common';
import { useInspector } from '../../../hooks/use_inspector';
import { IndicatorsFieldBrowser } from '../components/table/field_browser';
import { INSPECT_BUTTON_TEST_ID } from './test_ids';
import { INSPECT_BUTTON_TITLE } from './translations';

export const useToolbarOptions = ({
  browserFields,
  start,
  end,
  indicatorCount,
  columns,
  onResetColumns,
  onToggleColumn,
}: {
  browserFields: Readonly<Record<string, Partial<BrowserField>>>;
  start: number;
  end: number;
  indicatorCount: number;
  columns: EuiDataGridColumn[];
  onResetColumns: () => void;
  onToggleColumn: (columnId: string) => void;
}) => {
  const { onOpenInspector: handleOpenInspector } = useInspector();

  return useMemo(
    () => ({
      showDisplaySelector: false,
      showFullScreenSelector: true,
      additionalControls: {
        left: {
          prepend: (
            <EuiText style={{ display: 'inline' }} size="xs">
              {indicatorCount && end ? (
                <>
                  Showing {start + 1}-{end > indicatorCount ? indicatorCount : end} of{' '}
                  {indicatorCount} indicators
                </>
              ) : (
                <>-</>
              )}
            </EuiText>
          ),
          append: (
            <IndicatorsFieldBrowser
              browserFields={browserFields}
              columnIds={columns.map(({ id }) => id)}
              onResetColumns={onResetColumns}
              onToggleColumn={onToggleColumn}
            />
          ),
        },
        right: (
          <EuiButtonIcon
            aria-label={INSPECT_BUTTON_TITLE}
            iconType="inspect"
            title={INSPECT_BUTTON_TITLE}
            data-test-subj={INSPECT_BUTTON_TEST_ID}
            onClick={handleOpenInspector}
          />
        ),
      },
    }),
    [
      indicatorCount,
      end,
      start,
      browserFields,
      columns,
      onResetColumns,
      onToggleColumn,
      handleOpenInspector,
    ]
  );
};
