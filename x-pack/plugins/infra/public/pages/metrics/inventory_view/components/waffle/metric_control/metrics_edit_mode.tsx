/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getCustomMetricLabel } from '../../../../../../../common/formatters/get_custom_metric_label';
import { SnapshotCustomMetricInput } from '../../../../../../../common/http_api/snapshot_api';
import {
  EuiTheme,
  withTheme,
} from '../../../../../../../../../legacy/common/eui_styled_components';

interface Props {
  theme: EuiTheme | undefined;
  customMetrics: SnapshotCustomMetricInput[];
  options: Array<{ text: string; value: string }>;
  onEdit: (metric: SnapshotCustomMetricInput) => void;
  onDelete: (metric: SnapshotCustomMetricInput) => void;
}
const ICON_WIDTH = 36;

export const MetricsEditMode = withTheme(
  ({ theme, customMetrics, options, onEdit, onDelete }: Props) => {
    return (
      <div style={{ width: 256 }}>
        {options.map((option) => (
          <div key={option.value} style={{ padding: '14px 14px 13px 36px' }}>
            <span style={{ color: theme?.eui.euiButtonColorDisabled }}>{option.text}</span>
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
