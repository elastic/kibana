/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';

import { EuiFlyoutBody, EuiFlyoutHeader, EuiSpacer, EuiTitle } from '@elastic/eui';

import {
  DashboardContainer,
  DashboardEmbeddable,
} from '../../../../../src/legacy/core_plugins/dashboard_embeddable/public';
import {
  CONTEXT_MENU_TRIGGER,
  Trigger,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';

import { ActionEditor, EventEditor } from '../event_configuration/';

import { DASHBOARD_DRILLDOWN_ACTION } from './dashboard_drilldown_action_factory';
import { NAVIGATE_ACTION_TYPE } from './navigate_action_factory';

interface Props {
  container: DashboardContainer;
  embeddable: DashboardEmbeddable;
  onClose: () => void;
  panelId: string;
}

interface State {
  id?: string;
  selectedTrigger: string;
}

export class AddNavigateActionFlyout extends Component<Props, State> {
  private trigger?: Trigger;

  constructor(props: Props) {
    super(props);
    this.state = {
      selectedTrigger: '',
    };
  }

  public async componentDidMount() {}

  public renderBody() {
    if (this.state.id) {
      return (
        <ActionEditor
          embeddable={this.props.embeddable}
          actionId={this.state.id}
          selectedTriggerId={this.state.selectedTrigger}
          clearEditor={() => this.setState({ id: undefined })}
        />
      );
    } else {
      return (
        <div>
          <EventEditor
            embeddable={this.props.embeddable}
            actionTypes={[NAVIGATE_ACTION_TYPE, DASHBOARD_DRILLDOWN_ACTION]}
            onEditAction={(id: string) => this.setState({ id })}
            hideTriggerIds={[CONTEXT_MENU_TRIGGER]}
          />
          <EuiSpacer size="l" />
        </div>
      );
    }
  }

  public render() {
    return (
      <React.Fragment>
        <EuiFlyoutHeader>
          <EuiTitle size="s" data-test-subj="customizePanelTitle">
            <h1>{this.props.embeddable.getOutput().title}</h1>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{this.renderBody()}</EuiFlyoutBody>
      </React.Fragment>
    );
  }
}
