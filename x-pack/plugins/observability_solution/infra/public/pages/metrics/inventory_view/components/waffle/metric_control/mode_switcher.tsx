/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SNAPSHOT_API_MAX_METRICS } from '../../../../../../../common/constants';
import { CustomMetricMode } from './types';
import { SnapshotCustomMetricInput } from '../../../../../../../common/http_api/snapshot_api';

interface Props {
  onEdit: () => void;
  onAdd: () => void;
  onSave: () => void;
  onEditCancel: () => void;
  mode: CustomMetricMode;
  customMetrics: SnapshotCustomMetricInput[];
  disableAdd?: boolean;
}

export const ModeSwitcher = ({
  onSave,
  onEditCancel,
  onEdit,
  onAdd,
  mode,
  customMetrics,
  disableAdd = false,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  if (['editMetric', 'addMetric'].includes(mode)) {
    return null;
  }
  return (
    <div
      style={{
        borderTop: `${euiTheme.border.thin} solid ${euiTheme.border.color}`,
        padding: 12,
      }}
    >
      <EuiFlexGroup justifyContent="spaceBetween">
        {mode === 'edit' ? (
          <>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="infraModeSwitcherCancelButton"
                size="s"
                flush="left"
                onClick={onEditCancel}
                aria-label={i18n.translate(
                  'xpack.infra.waffle.customMetrics.modeSwitcher.cancelAriaLabel',
                  { defaultMessage: 'Cancel edit mode' }
                )}
              >
                <FormattedMessage
                  id="xpack.infra.waffle.customMetrics.modeSwitcher.cancel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="infraModeSwitcherSaveButton"
                onClick={onSave}
                size="s"
                fill
                aria-label={i18n.translate(
                  'xpack.infra.waffle.customMetrics.modeSwitcher.saveButtonAriaLabel',
                  { defaultMessage: 'Save changes to custom metrics' }
                )}
              >
                <FormattedMessage
                  id="xpack.infra.waffle.customMetrics.modeSwitcher.saveButton"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>
          </>
        ) : (
          <>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="infraModeSwitcherEditButton"
                size="s"
                flush="left"
                onClick={onEdit}
                disabled={customMetrics.length === 0}
                aria-label={i18n.translate(
                  'xpack.infra.waffle.customMetrics.modeSwitcher.editAriaLabel',
                  { defaultMessage: 'Edit custom metrics' }
                )}
              >
                <FormattedMessage
                  id="xpack.infra.waffle.customMetrics.modeSwitcher.edit"
                  defaultMessage="Edit"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={
                  disableAdd
                    ? i18n.translate(
                        'xpack.infra.waffle.customMetrics.modeSwitcher.addDisabledTooltip',
                        {
                          defaultMessage: 'Maximum number of {maxMetrics} metrics reached.',
                          values: { maxMetrics: SNAPSHOT_API_MAX_METRICS },
                        }
                      )
                    : undefined
                }
              >
                <EuiButtonEmpty
                  data-test-subj="infraModeSwitcherAddMetricButton"
                  onClick={onAdd}
                  disabled={disableAdd}
                  size="s"
                  flush="right"
                  aria-label={i18n.translate(
                    'xpack.infra.waffle.customMetrics.modeSwitcher.addMetricAriaLabel',
                    { defaultMessage: 'Add custom metric' }
                  )}
                >
                  <FormattedMessage
                    id="xpack.infra.waffle.customMetrics.modeSwitcher.addMetric"
                    defaultMessage="Add metric"
                  />
                </EuiButtonEmpty>
              </EuiToolTip>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    </div>
  );
};
