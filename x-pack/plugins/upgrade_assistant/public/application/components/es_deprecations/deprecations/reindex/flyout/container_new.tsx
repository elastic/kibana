/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DocLinksStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiPortal,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { EnrichedDeprecationInfo, ReindexStatus } from '../../../../../../../common/types';

import { ReindexState } from '../use_reindex_status';
import { ReindexWarnings } from './warnings';
import { ReindexChangesSection } from './reindex_changes';
import { ReindexProgress } from './progress';

interface ReindexFlyoutProps {
  indexName: string;
  closeFlyout: () => void;
  reindexState: ReindexState;
  startReindex: () => void;
  cancelReindex: () => void;
  docLinks: DocLinksStart;
  reindexBlocker?: EnrichedDeprecationInfo['blockerForReindexing'];
}

const i18nTexts = {
  flyoutAriaLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindexing.flyoutAriaLabel',
    {
      defaultMessage: 'Reindex',
    }
  ),
  getFlyoutTitle: (indexName: string) =>
    i18n.translate('xpack.upgradeAssistant.esDeprecations.reindexing.flyoutTitle', {
      defaultMessage: 'Reindex {indexName}',
      values: { indexName },
    }),
};

export const ReindexFlyout: React.FunctionComponent<ReindexFlyoutProps> = ({
  closeFlyout,
  indexName,
  reindexState,
  reindexBlocker,
  cancelReindex,
}) => {
  const { reindexWarnings, status, hasRequiredPrivileges } = reindexState;
  const hasReindexWarnings =
    Boolean(reindexWarnings && reindexWarnings.length > 0) && status === undefined;
  const isIndexClosed = reindexBlocker === 'index-closed' && status !== ReindexStatus.completed;

  return (
    <EuiPortal>
      <EuiFlyout
        onClose={closeFlyout}
        aria-labelledby={i18nTexts.flyoutAriaLabel}
        ownFocus
        size="m"
        maxWidth
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2>{i18nTexts.getFlyoutTitle(indexName)}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {/* Any warnings to display to the user before reindexing */}
          <ReindexWarnings
            showIndexClosedWarning={isIndexClosed}
            showUnauthorizedWarning={Boolean(hasRequiredPrivileges)}
          />

          {/* A list of changes that will occur as part of the reindex that the user must accept */}
          {hasReindexWarnings && (
            <>
              <EuiSpacer />
              <ReindexChangesSection warnings={reindexWarnings!} />
            </>
          )}

          {/* Reindex process section */}
          <ReindexProgress reindexState={reindexState} cancelReindex={cancelReindex} />
        </EuiFlyoutBody>

        {/* <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.closeButtonLabel"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                color={status === ReindexStatus.paused ? 'warning' : 'primary'}
                iconType={status === ReindexStatus.paused ? 'play' : undefined}
                onClick={startReindex}
                isLoading={loading}
                disabled={loading || status === ReindexStatus.completed || !hasRequiredPrivileges}
              >
                {buttonLabel(status)}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter> */}
      </EuiFlyout>
    </EuiPortal>
  );
};
