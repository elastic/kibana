/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import {
  TECHNICAL_PREVIEW,
  TECHNICAL_PREVIEW_DESCRIPTION,
} from '../../../timelines/components/side_panel/event_details/translations';
import { useIsolateHostPanelContext } from './context';
import { FLYOUT_HEADER_TITLE_TEST_ID } from './test_ids';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { isAlertFromSentinelOneEvent } from '../../../common/utils/sentinelone_alert_check';

/**
 * Document details expandable right section header for the isolate host panel
 */
export const PanelHeader: FC = () => {
  const { isolateAction, dataFormattedForFieldBrowser: data } = useIsolateHostPanelContext();
  const isSentinelOneAlert = isAlertFromSentinelOneEvent({ data });
  const isSentinelOneV1Enabled = useIsExperimentalFeatureEnabled(
    'responseActionsSentinelOneV1Enabled'
  );
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
      {isSentinelOneV1Enabled && isSentinelOneAlert && (
        <EuiFlexItem grow={false}>
          <EuiBetaBadge label={TECHNICAL_PREVIEW} tooltipContent={TECHNICAL_PREVIEW_DESCRIPTION} />
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
