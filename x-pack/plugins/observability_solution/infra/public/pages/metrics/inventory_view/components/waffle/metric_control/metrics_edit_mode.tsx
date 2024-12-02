/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonIcon,
  withEuiTheme,
  type WithEuiThemeProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getCustomMetricLabel } from '../../../../../../../common/formatters/get_custom_metric_label';
import { SnapshotCustomMetricInput } from '../../../../../../../common/http_api/snapshot_api';

interface Props {
  customMetrics: SnapshotCustomMetricInput[];
  options: Array<{ text: string; value: string }>;
  onEdit: (metric: SnapshotCustomMetricInput) => void;
  onDelete: (metric: SnapshotCustomMetricInput) => void;
}

type PropsWithTheme = Props & WithEuiThemeProps;

const ICON_WIDTH = 36;

export const MetricsEditMode = withEuiTheme(
  ({ theme, customMetrics, options, onEdit, onDelete }: PropsWithTheme) => {
    return (
      <div style={{ width: 256 }}>
        {options.map((option) => (
          <div key={option.value} style={{ padding: '14px 14px 13px 36px' }}>
            <span style={{ color: theme?.euiTheme.colors.disabled }}>{option.text}</span>
          </div>
        ))}
        {customMetrics.map((metric) => (
          <EuiFlexGroup
            key={metric.id}
            alignItems="center"
            gutterSize="none"
            style={{ padding: '10px 0px 9px' }}
          >
            <EuiFlexItem grow={false} style={{ width: ICON_WIDTH }}>
              <EuiButtonIcon
                data-test-subj="infraMetricsEditModeButton"
                iconType="pencil"
                onClick={() => onEdit(metric)}
                aria-label={i18n.translate(
                  'xpack.infra.waffle.customMetrics.editMode.editButtonAriaLabel',
                  {
                    defaultMessage: 'Edit custom metric for {name}',
                    values: { name: getCustomMetricLabel(metric) },
                  }
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={1} style={{ overflow: 'hidden' }}>
              {getCustomMetricLabel(metric)}
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ width: ICON_WIDTH, textAlign: 'right' }}>
              <EuiButtonIcon
                data-test-subj="infraMetricsEditModeButton"
                iconType="trash"
                color="danger"
                onClick={() => onDelete(metric)}
                aria-label={i18n.translate(
                  'xpack.infra.waffle.customMetrics.editMode.deleteAriaLabel',
                  {
                    defaultMessage: 'Delete custom metric for {name}',
                    values: { name: getCustomMetricLabel(metric) },
                  }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ))}
      </div>
    );
  }
);
