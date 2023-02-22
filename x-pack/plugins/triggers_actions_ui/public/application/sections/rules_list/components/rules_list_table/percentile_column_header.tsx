/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { MONITORING_HISTORY_LIMIT } from '@kbn/alerting-plugin/common';
import { EuiToolTip, EuiSelectableOption, EuiIcon } from '@elastic/eui';
import { PercentileSelectablePopover } from '../percentile_selectable_popover';
import { Percentiles } from '../../../../../types';

const percentileOrdinals = {
  [Percentiles.P50]: '50th',
  [Percentiles.P95]: '95th',
  [Percentiles.P99]: '99th',
};

export interface PercentileColumnHeaderProps {
  percentileOptions: EuiSelectableOption[];
  selectedPercentile: Percentiles;
  onPercentileOptionsChange: (options: EuiSelectableOption[]) => void;
}

export const PercentileColumnHeader = (props: PercentileColumnHeaderProps) => {
  const { percentileOptions, selectedPercentile, onPercentileOptionsChange } = props;

  return (
    <span data-test-subj={`rulesTable-${selectedPercentile}ColumnName`}>
      <EuiToolTip
        content={i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.ruleExecutionPercentileTooltip',
          {
            defaultMessage: `{percentileOrdinal} percentile of this rule's past {sampleLimit} run durations (mm:ss).`,
            values: {
              percentileOrdinal: percentileOrdinals[selectedPercentile!],
              sampleLimit: MONITORING_HISTORY_LIMIT,
            },
          }
        )}
      >
        <span>
          {selectedPercentile}&nbsp;
          <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
        </span>
      </EuiToolTip>
      <PercentileSelectablePopover
        options={percentileOptions}
        onOptionsChange={onPercentileOptionsChange}
      />
    </span>
  );
};
