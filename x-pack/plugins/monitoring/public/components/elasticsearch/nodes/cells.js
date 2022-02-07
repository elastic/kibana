/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { get } from 'lodash';
import { formatMetric } from '../../../lib/format_number';
import {
  EuiText,
  EuiPopover,
  EuiButtonIcon,
  EuiDescriptionList,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const TRENDING_DOWN = i18n.translate('xpack.monitoring.elasticsearch.node.cells.trendingDownText', {
  defaultMessage: 'down',
});
const TRENDING_UP = i18n.translate('xpack.monitoring.elasticsearch.node.cells.trendingUpText', {
  defaultMessage: 'up',
});

function OfflineCell() {
  return <div className="monTableCell__offline">N/A</div>;
}

const getDirection = (slope) => {
  if (slope || slope === 0) {
    return slope > 0 ? TRENDING_UP : TRENDING_DOWN;
  }
  return null;
};

const getIcon = (slope) => {
  if (slope || slope === 0) {
    return slope > 0 ? 'sortUp' : 'sortDown';
  }
  return null;
};

const metricVal = (metric, format, isPercent, units) => {
  if (isPercent) {
    return formatMetric(metric, format, '%', { prependSpace: false });
  }
  return formatMetric(metric, format, units);
};

function MetricCell({ isOnline, metric = {}, isPercent, ...props }) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onButtonClick = () => setIsPopoverOpen((isPopoverOpen) => !isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  if (!isOnline) {
    return <OfflineCell />;
  }

  const { lastVal, maxVal, minVal, slope } = get(metric, 'summary', {});
  const format = get(metric, 'metric.format');
  const units = get(metric, 'metric.units');

  const tooltipItems = [
    {
      title: i18n.translate('xpack.monitoring.elasticsearch.node.cells.tooltip.trending', {
        defaultMessage: 'Trending',
      }),
      description: getDirection(slope),
    },
    {
      title: i18n.translate('xpack.monitoring.elasticsearch.node.cells.tooltip.max', {
        defaultMessage: 'Max value',
      }),
      description: metricVal(maxVal, format, isPercent, units),
    },
    {
      title: i18n.translate('xpack.monitoring.elasticsearch.node.cells.tooltip.min', {
        defaultMessage: 'Min value',
      }),
      description: metricVal(minVal, format, isPercent, units),
    },
  ];

  const iconLabel = i18n.translate('xpack.monitoring.elasticsearch.node.cells.tooltip.iconLabel', {
    defaultMessage: 'More information about this metric',
  });

  const button = (
    <EuiButtonIcon
      color="text"
      onClick={onButtonClick}
      iconType={getIcon(slope)}
      data-test-subj={`monitoringCellIcon-${props['data-test-subj']}`}
      title={iconLabel}
      aria-label={iconLabel}
    />
  );

  return (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false} />
      <EuiFlexItem grow={false}>
        <EuiFlexGroup data-test-subj={props['data-test-subj']} gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiPopover ownFocus button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
              <div data-test-subj={`monitoringCellPopover-${props['data-test-subj']}`}>
                <EuiDescriptionList
                  type="column"
                  compressed
                  listItems={tooltipItems}
                  style={{ maxWidth: '150px' }}
                />
                <EuiSpacer size="s" />
                <EuiText size="xs">
                  {i18n.translate('xpack.monitoring.elasticsearch.node.cells.tooltip.preface', {
                    defaultMessage: 'Applies to current time period',
                  })}
                </EuiText>
              </div>
            </EuiPopover>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText>{metricVal(lastVal, format, isPercent)}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export { OfflineCell, MetricCell };
