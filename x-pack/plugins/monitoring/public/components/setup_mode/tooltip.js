/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { get } from 'lodash';
import { EuiBadge, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getIdentifier } from './formatting';

export function SetupModeTooltip({ setupModeData, badgeClickLink, productName }) {
  if (!setupModeData) {
    return null;
  }

  const {
    totalUniqueInstanceCount,
    totalUniqueFullyMigratedCount,
    totalUniquePartiallyMigratedCount,
  } = setupModeData;
  const allMonitoredByMetricbeat =
    totalUniqueInstanceCount > 0 &&
    (totalUniqueFullyMigratedCount === totalUniqueInstanceCount ||
      totalUniquePartiallyMigratedCount === totalUniqueInstanceCount);
  const internalCollectionOn = totalUniquePartiallyMigratedCount > 0;
  const mightExist =
    get(setupModeData, 'detected.mightExist') || get(setupModeData, 'detected.doesExist');

  let tooltip = null;

  if (totalUniqueInstanceCount === 0) {
    if (mightExist) {
      const detectedText = i18n.translate('xpack.monitoring.setupMode.tooltip.detected', {
        defaultMessage: 'No monitoring',
      });
      tooltip = (
        <EuiToolTip
          position="top"
          content={i18n.translate('xpack.monitoring.setupMode.tooltip.mightExist', {
            defaultMessage: `We detected usage of this product. Click to start monitoring.`,
          })}
        >
          <EuiBadge
            color="warning"
            iconType="flag"
            href={badgeClickLink}
            onClickAriaLabel={detectedText}
          >
            {detectedText}
          </EuiBadge>
        </EuiToolTip>
      );
    } else {
      const noMonitoringText = i18n.translate('xpack.monitoring.setupMode.tooltip.noUsage', {
        defaultMessage: 'No usage',
      });

      tooltip = (
        <EuiToolTip
          position="top"
          content={i18n.translate('xpack.monitoring.setupMode.tooltip.noUsageDetected', {
            defaultMessage: `We did not detect any usage. Click to view {identifier}.`,
            values: {
              identifier: getIdentifier(productName, true),
            },
          })}
        >
          <EuiBadge
            color="hollow"
            iconType="flag"
            href={badgeClickLink}
            onClickAriaLabel={noMonitoringText}
          >
            {noMonitoringText}
          </EuiBadge>
        </EuiToolTip>
      );
    }
  } else if (!allMonitoredByMetricbeat) {
    const internalCollection = i18n.translate(
      'xpack.monitoring.euiTable.isInternalCollectorLabel',
      {
        defaultMessage: 'Self monitoring',
      }
    );
    tooltip = (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.monitoring.setupMode.tooltip.oneInternal', {
          defaultMessage: `At least one {identifier} isn’t monitored using Metricbeat. Click to view status.`,
          values: {
            identifier: getIdentifier(productName),
          },
        })}
      >
        <EuiBadge
          color="danger"
          iconType="flag"
          href={badgeClickLink}
          onClickAriaLabel={internalCollection}
        >
          {internalCollection}
        </EuiBadge>
      </EuiToolTip>
    );
  } else if (internalCollectionOn) {
    const internalAndMB = i18n.translate('xpack.monitoring.euiTable.isPartiallyMigratedLabel', {
      defaultMessage: 'Self monitoring is on',
    });
    tooltip = (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.monitoring.setupMode.tooltip.disableInternal', {
          defaultMessage: `Metricbeat is monitoring all {identifierPlural}. Click to view {identifierPlural} and disable self monitoring.`,
          values: {
            identifierPlural: getIdentifier(productName, true),
          },
        })}
      >
        <EuiBadge
          color="warning"
          iconType="flag"
          href={badgeClickLink}
          onClickAriaLabel={internalAndMB}
        >
          {internalAndMB}
        </EuiBadge>
      </EuiToolTip>
    );
  } else {
    const metricbeatCollection = i18n.translate('xpack.monitoring.euiTable.isFullyMigratedLabel', {
      defaultMessage: 'Metricbeat monitoring',
    });
    tooltip = (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.monitoring.setupMode.tooltip.allSet', {
          defaultMessage: `Metricbeat is monitoring all {identifierPlural}.`,
          values: {
            identifierPlural: getIdentifier(productName, true),
          },
        })}
      >
        <EuiBadge
          color="secondary"
          iconType="flag"
          href={badgeClickLink}
          onClickAriaLabel={metricbeatCollection}
        >
          {metricbeatCollection}
        </EuiBadge>
      </EuiToolTip>
    );
  }

  return <EuiFlexItem grow={false}>{tooltip}</EuiFlexItem>;
}
