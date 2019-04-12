/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPage, EuiTab } from '@elastic/eui';
import React, { Component } from 'react';
import {
  Embeddable,
  CONTEXT_MENU_TRIGGER,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { ActionEditor } from './action_editor';
import { ActionListing } from './action_listing';
import { EventEditor } from './event_editor';

export interface AppProps {
  embeddable?: Embeddable;
}

interface AppState {
  selectedActionId: string;
  tabId: string;
}

export class ActionEventEditorApp extends Component<AppProps, AppState> {
  private tabs: Array<{ id: string; name: string }>;
  constructor(props: AppProps) {
    super(props);

    this.state = {
      selectedActionId: '',
      tabId: 'events',
    };

    this.tabs = [
      {
        id: 'actions',
        name: 'Actions',
      },
      {
        id: 'events',
        name: 'Events',
      },
    ];
  }

  public render() {
    return (
      <div>
        {this.renderTabs()}
        <EuiPage>{this.renderTabBody()}</EuiPage>
      </div>
    );
  }

  public renderTabBody() {
    switch (this.state.tabId) {
      case 'events': {
        return (
          <EventEditor
            hideTriggerIds={[CONTEXT_MENU_TRIGGER]}
            embeddable={this.props.embeddable}
            onEditAction={this.onEditAction}
          />
        );
      }
      case 'actions': {
        return this.state.selectedActionId !== ''
          ? this.renderEditAction()
          : this.renderActionListing();
      }
    }
  }

  public renderTabs() {
    return this.tabs.map((tab: { id: string; name: string }, index: number) => (
      <EuiTab
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.state.tabId}
        key={index}
      >
        {tab.name}
      </EuiTab>
    ));
  }

  public onSelectedTabChanged = (id: string) => {
    this.setState({
      tabId: id,
    });
  };

  private renderActionListing() {
    return (
      <ActionListing
        onEditAction={(action: Action) => this.onEditAction(action.id)}
        embeddable={this.props.embeddable}
      />
    );
  }

  private renderEditAction() {
    return (
      <ActionEditor
        clearEditor={this.clearEditor}
        actionId={this.state.selectedActionId}
        embeddable={this.props.embeddable}
      />
    );
  }

  private clearEditor = () => {
    this.setState({ selectedActionId: '' });
  };

  private onEditAction = (id: string) => {
    this.setState({ selectedActionId: id, tabId: 'actions' });
  };
}
