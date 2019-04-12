/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';

import React, { Component } from 'react';
import {
  DashboardContainer,
  DashboardEmbeddable,
} from '../../../../../src/legacy/core_plugins/dashboard_embeddable/public';
import { CONTEXT_MENU_TRIGGER } from '../../../../../src/legacy/core_plugins/embeddable_api/public/';
import { EventEditor } from '../event_configuration';

interface CustomizeEventsFlyoutProps {
  container: DashboardContainer;
  embeddable: DashboardEmbeddable;
  onClose: () => void;
}

export class CustomizeEventsFlyout extends Component<CustomizeEventsFlyoutProps> {
  constructor(props: CustomizeEventsFlyoutProps) {
    super(props);
    this.state = {};
  }

  public render() {
    return (
      <React.Fragment>
        <EuiFlyoutHeader>
          <EuiTitle size="s" data-test-subj="customizePanelTitle">
            <h1>{this.props.embeddable.getOutput().title}</h1>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EventEditor embeddable={this.props.embeddable} hideTriggerIds={[CONTEXT_MENU_TRIGGER]} />
        </EuiFlyoutBody>
      </React.Fragment>
    );
  }
}
