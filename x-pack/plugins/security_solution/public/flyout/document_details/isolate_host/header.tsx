/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { isAlertFromCrowdstrikeEvent } from '../../../common/utils/crowdstrike_alert_check';
import { TECHNICAL_PREVIEW, TECHNICAL_PREVIEW_TOOLTIP } from '../../../common/translations';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { isAlertFromSentinelOneEvent } from '../../../common/utils/sentinelone_alert_check';
import { useIsolateHostPanelContext } from './context';
import { FLYOUT_HEADER_TITLE_TEST_ID } from './test_ids';
import { FlyoutHeader } from '../../shared/components/flyout_header';

/**
 * Document details expandable right section header for the isolate host panel
 */
export const PanelHeader: FC = () => {
  const { isolateAction, dataFormattedForFieldBrowser: data } = useIsolateHostPanelContext();
  const isSentinelOneAlert = isAlertFromSentinelOneEvent({ data });
  const isSentinelOneV1Enabled = useIsExperimentalFeatureEnabled(
    'responseActionsSentinelOneV1Enabled'
  );

  const isAlertFromCrowdstrikeAlert = isAlertFromCrowdstrikeEvent({ data });
  const responseActionsCrowdstrikeManualHostIsolationEnabled = useIsExperimentalFeatureEnabled(
    'responseActionsCrowdstrikeManualHostIsolationEnabled'
  );
  const showAsTechPreview =
    (isSentinelOneV1Enabled && isSentinelOneAlert) ||
    (responseActionsCrowdstrikeManualHostIsolationEnabled && isAlertFromCrowdstrikeAlert);
  const title = (
    <EuiFlexGroup responsive gutterSize="s">
      <EuiFlexItem grow={false}>
        {isolateAction === 'isolateHost' ? (
          <FormattedMessage
            id="xpack.securitySolution.flyout.isolateHost.isolateTitle"
            defaultMessage="Isolate host"
          />
        ) : (
          <FormattedMessage
            id="xpack.securitySolution.flyout.isolateHost.releaseTitle"
            defaultMessage="Release host"
          />
        )}
      </EuiFlexItem>
      {showAsTechPreview && (
        <EuiFlexItem grow={false}>
          <EuiBetaBadge label={TECHNICAL_PREVIEW} tooltipContent={TECHNICAL_PREVIEW_TOOLTIP} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  return (
    <FlyoutHeader>
      <EuiTitle size="s">
        <h4 data-test-subj={FLYOUT_HEADER_TITLE_TEST_ID}>{title}</h4>
      </EuiTitle>
    </FlyoutHeader>
  );
};
