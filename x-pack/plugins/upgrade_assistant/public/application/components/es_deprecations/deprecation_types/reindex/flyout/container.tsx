/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlyoutHeader, EuiSpacer, EuiTitle } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';

import { EnrichedDeprecationInfo, ReindexStatus } from '../../../../../../../common/types';

import type { ReindexStateContext } from '../context';
import { ChecklistFlyoutStep } from './checklist_step';
import { WarningsFlyoutStep } from './warnings_step';
import { DeprecationBadge } from '../../../../shared';
import {
  UIM_REINDEX_START_CLICK,
  UIM_REINDEX_STOP_CLICK,
  uiMetricService,
} from '../../../../../lib/ui_metric';

export interface ReindexFlyoutProps extends ReindexStateContext {
  deprecation: EnrichedDeprecationInfo;
  closeFlyout: () => void;
}

export const ReindexFlyout: React.FunctionComponent<ReindexFlyoutProps> = ({
  reindexState,
  startReindex,
  cancelReindex,
  closeFlyout,
  deprecation,
}) => {
  const { status, reindexWarnings } = reindexState;
  const { index } = deprecation;

  const [showWarningsStep, setShowWarningsStep] = useState(false);

  const onStartReindex = useCallback(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_REINDEX_START_CLICK);
    startReindex();
  }, [startReindex]);

  const onStopReindex = useCallback(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_REINDEX_STOP_CLICK);
    cancelReindex();
  }, [cancelReindex]);

  const startReindexWithWarnings = () => {
    if (
      reindexWarnings &&
      reindexWarnings.length > 0 &&
      status !== ReindexStatus.inProgress &&
      status !== ReindexStatus.completed
    ) {
      setShowWarningsStep(true);
    } else {
      onStartReindex();
    }
  };
  const flyoutContents = showWarningsStep ? (
    <WarningsFlyoutStep
      warnings={reindexState.reindexWarnings ?? []}
      meta={reindexState.meta}
      hideWarningsStep={() => setShowWarningsStep(false)}
      continueReindex={() => {
        setShowWarningsStep(false);
        onStartReindex();
      }}
    />
  ) : (
    <ChecklistFlyoutStep
      closeFlyout={closeFlyout}
      startReindex={startReindexWithWarnings}
      reindexState={reindexState}
      cancelReindex={onStopReindex}
    />
  );

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <DeprecationBadge
          isCritical={deprecation.isCritical}
          isResolved={status === ReindexStatus.completed}
        />
        <EuiSpacer size="s" />
        <EuiTitle size="s" data-test-subj="flyoutTitle">
          <h2 id="reindexDetailsFlyoutTitle">
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.flyoutHeader"
              defaultMessage="Reindex {index}"
              values={{ index }}
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      {flyoutContents}
    </>
  );
};
