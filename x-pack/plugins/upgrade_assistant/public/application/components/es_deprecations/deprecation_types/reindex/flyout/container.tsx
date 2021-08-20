/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { DocLinksStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiFlyoutHeader, EuiLink, EuiSpacer, EuiTitle } from '@elastic/eui';

import {
  EnrichedDeprecationInfo,
  ReindexAction,
  ReindexStatus,
} from '../../../../../../../common/types';
import { useAppContext } from '../../../../../app_context';

import type { ReindexStateContext } from '../context';
import { ChecklistFlyoutStep } from './checklist_step';
import { WarningsFlyoutStep } from './warnings_step';

enum ReindexFlyoutStep {
  reindexWarnings,
  checklist,
}

export interface ReindexFlyoutProps extends ReindexStateContext {
  deprecation: EnrichedDeprecationInfo;
  closeFlyout: () => void;
}

const getOpenAndCloseIndexDocLink = (docLinks: DocLinksStart) => (
  <EuiLink target="_blank" href={`${docLinks.links.apis.openIndex}`}>
    {i18n.translate(
      'xpack.upgradeAssistant.checkupTab.reindexing.flyout.openAndCloseDocumentation',
      { defaultMessage: 'documentation' }
    )}
  </EuiLink>
);

const getIndexClosedCallout = (docLinks: DocLinksStart) => (
  <>
    <EuiCallOut
      title={i18n.translate(
        'xpack.upgradeAssistant.checkupTab.reindexing.flyout.indexClosedCallout.calloutTitle',
        { defaultMessage: 'Index closed' }
      )}
      color="warning"
      iconType="alert"
    >
      <p>
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.indexClosedCallout.calloutDetails"
          defaultMessage="This index is currently closed. The Upgrade Assistant will open, reindex and then close the index. {reindexingMayTakeLongerEmph}. Please see the {docs} for more information."
          values={{
            docs: getOpenAndCloseIndexDocLink(docLinks),
            reindexingMayTakeLongerEmph: (
              <b>
                {i18n.translate(
                  'xpack.upgradeAssistant.checkupTab.reindexing.flyout.indexClosedCallout.calloutDetails.reindexingTakesLongerEmphasis',
                  { defaultMessage: 'Reindexing may take longer than usual' }
                )}
              </b>
            ),
          }}
        />
      </p>
    </EuiCallOut>
    <EuiSpacer size="m" />
  </>
);

export const ReindexFlyout: React.FunctionComponent<ReindexFlyoutProps> = ({
  reindexState,
  startReindex,
  cancelReindex,
  closeFlyout,
  deprecation,
}) => {
  const { status, reindexWarnings } = reindexState;
  const { index, correctiveAction } = deprecation;
  const { docLinks } = useAppContext();
  // If there are any warnings and we haven't started reindexing, show the warnings step first.
  const [currentFlyoutStep, setCurrentFlyoutStep] = useState<ReindexFlyoutStep>(
    reindexWarnings && reindexWarnings.length > 0 && status === undefined
      ? ReindexFlyoutStep.reindexWarnings
      : ReindexFlyoutStep.checklist
  );

  let flyoutContents: React.ReactNode;

  const globalCallout =
    (correctiveAction as ReindexAction).blockerForReindexing === 'index-closed' &&
    reindexState.status !== ReindexStatus.completed
      ? getIndexClosedCallout(docLinks)
      : undefined;
  switch (currentFlyoutStep) {
    case ReindexFlyoutStep.reindexWarnings:
      flyoutContents = (
        <WarningsFlyoutStep
          renderGlobalCallouts={() => globalCallout}
          closeFlyout={closeFlyout}
          warnings={reindexState.reindexWarnings!}
          advanceNextStep={() => setCurrentFlyoutStep(ReindexFlyoutStep.checklist)}
        />
      );
      break;
    case ReindexFlyoutStep.checklist:
      flyoutContents = (
        <ChecklistFlyoutStep
          renderGlobalCallouts={() => globalCallout}
          closeFlyout={closeFlyout}
          reindexState={reindexState}
          startReindex={startReindex}
          cancelReindex={cancelReindex}
        />
      );
      break;
    default:
      throw new Error(`Invalid flyout step: ${currentFlyoutStep}`);
  }

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" data-test-subj="flyoutTitle">
          <h2>
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
