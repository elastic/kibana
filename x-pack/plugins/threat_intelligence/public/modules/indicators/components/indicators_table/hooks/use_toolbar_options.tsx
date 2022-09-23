/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useMemo } from 'react';
import { EuiButtonIcon, EuiDataGridColumn, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { BrowserField } from '@kbn/rule-registry-plugin/common';
import { useInspector } from '../../../../../hooks/use_inspector';
import { IndicatorsFieldBrowser } from '../../indicators_field_browser';

const INSPECT_BUTTON_TEST_ID = 'tiIndicatorsGridInspect';

const INSPECT_BUTTON_TITLE = i18n.translate('xpack.threatIntelligence.inspectTitle', {
  defaultMessage: 'Inspect',
});

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
      showFullScreenSelector: false,
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
