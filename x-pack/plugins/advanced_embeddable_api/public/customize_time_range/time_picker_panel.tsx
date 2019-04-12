/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  // @ts-ignore missing typings for EuiSuperDatePicker
  EuiSuperDatePicker,
  EuiSwitch,
} from '@elastic/eui';
import React from 'react';
import { TimeRange } from '../../../../../src/legacy/core_plugins/embeddable_api/public';

import { FormattedMessage } from '@kbn/i18n/react';

interface TimePickerPanelProps {
  inherit: boolean;
  timeRange: TimeRange;
  onSave: ({ timeRange, inherit }: { timeRange: TimeRange; inherit: boolean }) => void;
}

interface TimePickePanelState {
  timeRange: TimeRange;
  inherit: boolean;
}

export class TimePickerPanel extends React.Component<TimePickerPanelProps, TimePickePanelState> {
  constructor(props: TimePickerPanelProps) {
    super(props);
    this.state = {
      timeRange: props.timeRange,
      inherit: props.inherit,
    };
  }
  // public static getDerivedStateFromProps = (nextProps: TimePickerPanelProps) => {
  //   return {
  //     timeRange: nextProps.timeRange,
  //     inherit: nextProps.inherit,
  //   };
  // };

  public maybeRenderDatePicker() {
    if (this.state.inherit) {
      return null;
    }
    return (
      <EuiSuperDatePicker
        start={this.state.timeRange.from}
        end={this.state.timeRange.to}
        onTimeChange={this.onTimeChange}
        showUpdateButton={false}
        isAutoRefreshOnly={false}
      />
    );
  }

  public render() {
    return (
      <div className="dshPanel__optionsMenuForm" data-test-subj="dashboardPanelTitleInputMenuItem">
        <EuiSwitch
          checked={this.state.inherit}
          data-test-subj="listControlMultiselectInput"
          label={
            <FormattedMessage
              defaultMessage="Inherit time range"
              id="timepicker.contextmenupanel.overrideTimeRange"
            />
          }
          onChange={this.toggleInherit}
        />
        {this.maybeRenderDatePicker()}

        <EuiButtonEmpty data-test-subj="resetCustomDashboardPanelTitle" onClick={this.save}>
          <FormattedMessage
            id="kbn.dashboard.panel.optionsMenuForm.resetCustomDashboardButtonLabel"
            defaultMessage="Save"
          />
        </EuiButtonEmpty>
      </div>
    );
  }

  private toggleInherit = () => {
    this.setState(prevState => {
      console.log('prevState is ', prevState);
      return { inherit: !prevState.inherit };
    });
  };

  private onTimeChange = ({ start, end }: { start: string; end: string }) => {
    this.setState({
      timeRange: {
        from: start,
        to: end,
      },
    });
  };

  private save = () => {
    this.props.onSave(this.state);
  };
}
