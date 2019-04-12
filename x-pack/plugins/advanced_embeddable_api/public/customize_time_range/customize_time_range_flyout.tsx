/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';

import { EuiBasicTable, EuiButton, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { TimeRange } from 'ui/visualize';
import chrome from 'ui/chrome';
import {
  DashboardContainer,
  DashboardEmbeddable,
} from '../../../../../src/legacy/core_plugins/dashboard_embeddable/public';
import {
  actionRegistry,
  CONTEXT_MENU_TRIGGER,
  Trigger,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { AddTimeRange } from './add_time_range';
import { ApplyTimeRangeAction } from './apply_time_range';
import { APPLY_TIME_RANGE } from './apply_time_range_factory';
import { deleteAction, removeTriggerActionMapping, isDynamicAction } from '../dynamic_actions';
import { hasDynamicActions } from '../dynamic_actions/actionable_embeddable';

interface CustomizeTimeRangeProps {
  container: DashboardContainer;
  embeddable: DashboardEmbeddable;
  onClose: () => void;
  panelId: string;
}

interface State {
  timeRangeActions: ApplyTimeRangeAction[];
}

export class CustomizeTimeRangeFlyout extends Component<CustomizeTimeRangeProps, State> {
  private trigger?: Trigger;
  constructor(props: CustomizeTimeRangeProps) {
    super(props);
    this.state = { timeRangeActions: [] };
  }

  public async componentDidMount() {
    const viewModeActions = await actionRegistry.getActionsForTrigger(CONTEXT_MENU_TRIGGER, {
      embeddable: this.props.embeddable,
    });

    const timeRangeActions = viewModeActions.filter(
      action => isDynamicAction(action) && action.type === APPLY_TIME_RANGE
    ) as ApplyTimeRangeAction[];

    this.setState({
      timeRangeActions,
    });
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
          <AddTimeRange onSave={this.addTimeRange} />
          {this.renderExistingActions()}
        </EuiFlyoutBody>
      </React.Fragment>
    );
  }

  private doesDefaultTimeRangeOptionExist = async () => {
    const actions = await actionRegistry.getActionsForTrigger(CONTEXT_MENU_TRIGGER, {
      embeddable: this.props.embeddable,
    });
    return actions.find(
      action =>
        isDynamicAction(action) &&
        action.type === APPLY_TIME_RANGE &&
        (action as ApplyTimeRangeAction).timeRange === undefined
    );
  };

  private ensureDefaultTimeRangeOptionExists = async () => {
    const exists = await this.doesDefaultTimeRangeOptionExist();
    if (!exists) {
      const defaultTimeRangeAction = new ApplyTimeRangeAction();
      defaultTimeRangeAction.timeRange = undefined;
      defaultTimeRangeAction.title = 'Use time range from dashboard';
      defaultTimeRangeAction.embeddableId = this.props.embeddable.id;
      defaultTimeRangeAction.triggerId = CONTEXT_MENU_TRIGGER;
      this.addAction(defaultTimeRangeAction);
    }
  };

  private addAction(action: ApplyTimeRangeAction) {
    const existingDynamicActions = hasDynamicActions(this.props.embeddable)
      ? this.props.embeddable.getInput().dynamicActions
      : [];

    existingDynamicActions.push(action.serialized());
    this.props.embeddable.updateInput({ dynamicActions: existingDynamicActions });
    const newActions = _.clone(this.state.timeRangeActions);
    newActions.push(action);
    this.setState({ timeRangeActions: newActions });
  }

  private addTimeRange = async (timeRange: TimeRange) => {
    await this.ensureDefaultTimeRangeOptionExists();

    const applyTimeRangeAction = new ApplyTimeRangeAction();
    applyTimeRangeAction.timeRange = timeRange;
    applyTimeRangeAction.title = JSON.stringify(timeRange);
    applyTimeRangeAction.embeddableId = this.props.embeddable.id;
    applyTimeRangeAction.triggerId = CONTEXT_MENU_TRIGGER;
    this.addAction(applyTimeRangeAction);
  };

  private renderExistingActions() {
    const columns = [
      {
        field: 'timeRange',
        sortable: false,
        name: 'Time range',
        render: (timeRange: TimeRange, action: ApplyTimeRangeAction) => {
          return action.getTitle();
        },
      },
      {
        field: 'id',
        sortable: false,
        name: 'Remove',
        render: (id: string) => (
          <EuiButton onClick={() => this.removeTimeRange(id)}>Delete</EuiButton>
        ),
      },
    ];
    return <EuiBasicTable columns={columns} items={this.state.timeRangeActions} sorting={{}} />;
  }

  private removeTimeRange = async (id: string) => {
    await removeTriggerActionMapping({ triggerId: CONTEXT_MENU_TRIGGER, actionId: id });
    await deleteAction(id, chrome.getSavedObjectsClient());

    const newActions = this.state.timeRangeActions.filter(action => action.id !== id);
    this.setState({ timeRangeActions: newActions });
  };
}
