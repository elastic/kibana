/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiFlyout, EuiFlyoutHeader, EuiPortal } from '@elastic/eui';
import { ReindexState } from '../polling_service';
import { ChecklistFlyoutStep } from './checklist_step';
import { WarningsFlyoutStep } from './warnings_step';

enum ReindexFlyoutStep {
  destructiveConfirmation,
  checklist,
}

interface ReindexFlyoutProps {
  indexName: string;
  closeFlyout: () => void;
  reindexState: ReindexState;
  startReindex: () => void;
}

interface ReindexFlyoutState {
  currentFlyoutStep: ReindexFlyoutStep;
}

/**
 * Wrapper for the contents of the flyout that manages which step of the flyout to show.
 */
export class ReindexFlyout extends React.Component<ReindexFlyoutProps, ReindexFlyoutState> {
  constructor(props: ReindexFlyoutProps) {
    super(props);
    const { reindexWarnings } = props.reindexState;

    this.state = {
      currentFlyoutStep:
        reindexWarnings && reindexWarnings.length > 0
          ? ReindexFlyoutStep.destructiveConfirmation
          : ReindexFlyoutStep.checklist,
    };
  }

  public render() {
    const { closeFlyout, indexName, reindexState, startReindex } = this.props;
    const { currentFlyoutStep } = this.state;

    let flyoutContents: React.ReactNode;
    switch (currentFlyoutStep) {
      case ReindexFlyoutStep.destructiveConfirmation:
        flyoutContents = (
          <WarningsFlyoutStep
            closeFlyout={closeFlyout}
            warnings={reindexState.reindexWarnings!}
            advanceNextStep={this.advanceNextStep}
          />
        );
        break;
      case ReindexFlyoutStep.checklist:
        flyoutContents = (
          <ChecklistFlyoutStep
            closeFlyout={closeFlyout}
            reindexState={reindexState}
            startReindex={startReindex}
          />
        );
        break;
      default:
        throw new Error(`Invalid flyout step: ${currentFlyoutStep}`);
    }

    return (
      <EuiPortal>
        <EuiFlyout onClose={closeFlyout} aria-labelledby="Reindex" ownFocus size="m">
          <EuiFlyoutHeader hasBorder>
            <h2>Reindex {indexName}</h2>
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
