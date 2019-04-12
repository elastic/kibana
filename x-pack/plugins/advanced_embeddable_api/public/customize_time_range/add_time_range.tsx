/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  // @ts-ignore missing typings for EuiSuperDatePicker
  EuiSuperDatePicker,
  EuiFormRow,
} from '@elastic/eui';
import React from 'react';
import { TimeRange, } from '../../../../../src/legacy/core_plugins/embeddable_api/public';

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';

interface Props {
  onSave: (timeRange: TimeRange) => void;
}

interface State {
  timeRange: TimeRange;
}

export class AddTimeRange extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      timeRange: {
        to: 'now',
        from: 'now-15m',
      },
    };
  }

  public render() {
    return (
      <EuiFormRow className="dshPanel__optionsMenuForm" data-test-subj="dashboardPanelTitleInputMenuItem">
      <EuiFlexGroup>
      <EuiFlexItem>
        <EuiSuperDatePicker
          start={this.state.timeRange.from}
          end={this.state.timeRange.to}
          onTimeChange={this.onTimeChange}
          showUpdateButton={false}
          isAutoRefreshOnly={false}
        />
        </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton data-test-subj="resetCustomDashboardPanelTitle" onClick={this.save}>
          <FormattedMessage
            id="kbn.dashboard.panel.optionsMenuForm.resetCustomDashboardButtonLabel"
            defaultMessage="Add"
          />
        </EuiButton>
        </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  }

  private onTimeChange = ({ start, end }: { start: string; end: string }) => {
    this.setState({
      timeRange: {
        from: start,
        to: end,
      },
    });
  };

  private save = () => {
    this.props.onSave(this.state.timeRange);
  };
}
