/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlyoutHeader, EuiSpacer, EuiTitle } from '@elastic/eui';

import { EnrichedDeprecationInfo, ReindexStatus } from '../../../../../../../common/types';

import type { ReindexStateContext } from '../context';
import { ChecklistFlyoutStep } from './checklist_step';
import { WarningsFlyoutStep } from './warnings_step';
import { DeprecationBadge } from '../../../../shared';

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

  const flyoutContents = showWarningsStep ? (
    <WarningsFlyoutStep
      warnings={reindexState.reindexWarnings ?? []}
      hideWarningsStep={() => setShowWarningsStep(false)}
      continueReindex={() => {
        setShowWarningsStep(false);
        startReindex();
      }}
    />
  ) : (
    <ChecklistFlyoutStep
      closeFlyout={closeFlyout}
      startReindex={() => {
        if (reindexWarnings && reindexWarnings.length > 0 && status === undefined) {
          setShowWarningsStep(true);
        } else {
          startReindex();
        }
      }}
      reindexState={reindexState}
      cancelReindex={cancelReindex}
    />
  );

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <DeprecationBadge
          isCritical={deprecation.isCritical}
          isResolved={reindexState.status === ReindexStatus.completed}
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
