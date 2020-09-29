/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DocLinksStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiLink,
  EuiPortal,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { EnrichedDeprecationInfo, ReindexStatus } from '../../../../../../../../common/types';

import { ReindexState } from '../polling_service';
import { ChecklistFlyoutStep } from './checklist_step';
import { WarningsFlyoutStep } from './warnings_step';

enum ReindexFlyoutStep {
  reindexWarnings,
  checklist,
}

interface ReindexFlyoutProps {
  indexName: string;
  closeFlyout: () => void;
  reindexState: ReindexState;
  startReindex: () => void;
  cancelReindex: () => void;
  docLinks: DocLinksStart;
  reindexBlocker?: EnrichedDeprecationInfo['blockerForReindexing'];
}

interface ReindexFlyoutState {
  currentFlyoutStep: ReindexFlyoutStep;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const getOpenAndCloseIndexDocLink = ({ ELASTIC_WEBSITE_URL, DOC_LINK_VERSION }: DocLinksStart) => (
  <EuiLink
    target="_blank"
    href={`${ELASTIC_WEBSITE_URL}/guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/indices-open-close.html`}
  >
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

/**
 * Wrapper for the contents of the flyout that manages which step of the flyout to show.
 */
export class ReindexFlyout extends React.Component<ReindexFlyoutProps, ReindexFlyoutState> {
  constructor(props: ReindexFlyoutProps) {
    super(props);
    const { status, reindexWarnings } = props.reindexState;

    this.state = {
      // If there are any warnings and we haven't started reindexing, show the warnings step first.
      currentFlyoutStep:
        reindexWarnings && reindexWarnings.length > 0 && status === undefined
          ? ReindexFlyoutStep.reindexWarnings
          : ReindexFlyoutStep.checklist,
    };
  }

  public render() {
    const {
      closeFlyout,
      indexName,
      reindexState,
      startReindex,
      cancelReindex,
      reindexBlocker,
      docLinks,
    } = this.props;
    const { currentFlyoutStep } = this.state;

    let flyoutContents: React.ReactNode;

    const globalCallout =
      reindexBlocker === 'index-closed' && reindexState.status !== ReindexStatus.completed
        ? getIndexClosedCallout(docLinks)
        : undefined;
    switch (currentFlyoutStep) {
      case ReindexFlyoutStep.reindexWarnings:
        flyoutContents = (
          <WarningsFlyoutStep
            renderGlobalCallouts={() => globalCallout}
            closeFlyout={closeFlyout}
            warnings={reindexState.reindexWarnings!}
            advanceNextStep={this.advanceNextStep}
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
      <EuiPortal>
        <EuiFlyout onClose={closeFlyout} aria-labelledby="Reindex" ownFocus size="m" maxWidth>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2>
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.flyoutHeader"
                  defaultMessage="Reindex {indexName}"
                  values={{ indexName }}
                />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          {flyoutContents}
        </EuiFlyout>
      </EuiPortal>
    );
  }

  public advanceNextStep = () => {
    this.setState({ currentFlyoutStep: ReindexFlyoutStep.checklist });
  };
}
