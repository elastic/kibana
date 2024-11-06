/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { InventoryItemType, SnapshotMetricType } from '@kbn/metrics-data-access-plugin/common';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { toMetricOpt } from '../../../../../common/snapshot_metric_i18n';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { ContentTabIds } from '../../types';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';

export const HOST_LEGACY_METRICS_DOC_HREF = 'https://ela.st/host-metrics-legacy';
const DISMISSAL_LEGACY_ALERT_METRIC_STORAGE_KEY = 'infraAssetDetails:legacy_alert_metric_dismissed';

export const LegacyAlertMetricCallout = ({
  visibleFor,
  metric,
}: {
  visibleFor: ContentTabIds[];
  metric: SnapshotMetricType;
}) => {
  const { activeTabId } = useTabSwitcherContext();
  const { asset } = useAssetDetailsRenderPropsContext();
  const [isDismissed, setDismissed] = useLocalStorage<boolean>(
    `${DISMISSAL_LEGACY_ALERT_METRIC_STORAGE_KEY}_${metric}`,
    false
  );

  const onDismiss = () => {
    setDismissed(true);
  };

  const metricLabel = toMetricOpt(metric, asset.id as InventoryItemType);
  const hideCallout = isDismissed || !visibleFor.includes(activeTabId as ContentTabIds);

  if (hideCallout || !metricLabel) {
    return null;
  }

  return (
    <EuiCallOut
      color="warning"
      iconType="warning"
      title={
        <FormattedMessage
          id="xpack.infra.assetDetails.callouts.legacyMetricAlertCallout.title"
          defaultMessage="We have an updated definition for {metric}"
          values={{
            metric: metricLabel.text,
          }}
        />
      }
      data-test-subj="infraAssetDetailsLegacyMetricAlertCallout"
      onDismiss={onDismiss}
    >
      <FormattedMessage
        id="xpack.infra.assetDetails.callouts.legacyMetricAlertCallout"
        defaultMessage="The alert you have clicked through is using the legacy {metric}. {learnMoreLink}"
        values={{
          metric: metricLabel.text,
          learnMoreLink: (
            <EuiLink
              data-test-subj="infraAssetDetailsLegacyMetricAlertCalloutLink"
              href={HOST_LEGACY_METRICS_DOC_HREF}
              target="_blank"
            >
              <FormattedMessage
                id="xpack.infra.assetDetails.callouts.legacyMetricAlertCallout.learnMoreLinkLabel"
                defaultMessage="Learn More"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  );
};
