/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiRadio,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle
} from '@elastic/eui';
import { memoize } from 'lodash';
import { padLeft, range } from 'lodash';
import moment from 'moment-timezone';
import React, { Component } from 'react';
import styled from 'styled-components';
import chrome from 'ui/chrome';
import { toastNotifications } from 'ui/notify';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { XPACK_DOCS } from '../../../../utils/documentation/xpack';
import { UnconnectedKibanaLink } from '../../../../utils/url';
import { createErrorGroupWatch, Schedule } from './createErrorGroupWatch';

type ScheduleKey = keyof Schedule;

const getUserTimezone = memoize(() => {
  const uiSettings = chrome.getUiSettingsClient();
  return uiSettings.get('dateFormat:tz') === 'Browser'
    ? moment.tz.guess()
    : uiSettings.get('dateFormat:tz');
});

const SmallInput = styled.div`
  .euiFormRow {
    max-width: 85px;
  }
  .euiFormHelpText {
    width: 200px;
  }
`;

interface WatcherFlyoutProps {
  urlParams: IUrlParams;
  onClose: () => void;
  location: any;
  isOpen: boolean;
}

type IntervalUnit = 'm' | 'h';

interface WatcherFlyoutState {
  schedule: ScheduleKey;
  threshold: number;
  actions: {
    slack: boolean;
    email: boolean;
  };
  interval: {
    value: number;
    unit: IntervalUnit;
  };
  daily: string;
  emails: string;
  slackUrl: string;
}

export class WatcherFlyout extends Component<
  WatcherFlyoutProps,
  WatcherFlyoutState
> {
  public state: WatcherFlyoutState = {
    schedule: 'daily',
    threshold: 10,
    actions: {
      slack: false,
      email: false
    },
    interval: {
      value: 10,
      unit: 'm'
    },
    daily: '08:00',
    emails: '',
    slackUrl: ''
  };

  public onChangeSchedule = (schedule: ScheduleKey) => {
    this.setState({ schedule });
  };

  public onChangeThreshold = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      threshold: parseInt(event.target.value, 10)
    });
  };

  public onChangeDailyUnit = (event: React.ChangeEvent<HTMLSelectElement>) => {
    this.setState({
      daily: event.target.value
    });
  };

  public onChangeIntervalValue = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    this.setState({
      interval: {
        value: parseInt(event.target.value, 10),
        unit: this.state.interval.unit
      }
    });
  };

  public onChangeIntervalUnit = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    this.setState({
      interval: {
        value: this.state.interval.value,
        unit: event.target.value as IntervalUnit
      }
    });
  };

  public onChangeAction = (actionName: 'slack' | 'email') => {
    this.setState({
      actions: {
        ...this.state.actions,
        [actionName]: !this.state.actions[actionName]
      }
    });
  };

  public onChangeEmails = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ emails: event.target.value });
  };

  public onChangeSlackUrl = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ slackUrl: event.target.value });
  };

  public createWatch = () => {
    const { serviceName } = this.props.urlParams;

    if (!serviceName) {
      return;
    }

    const emails = this.state.actions.email
      ? this.state.emails
          .split(',')
          .map(email => email.trim())
          .filter(email => !!email)
      : [];

    const slackUrl = this.state.actions.slack ? this.state.slackUrl : '';

    const schedule =
      this.state.schedule === 'interval'
        ? {
            interval: `${this.state.interval.value}${this.state.interval.unit}`
          }
        : {
            daily: { at: `${this.state.daily}` }
          };

    const timeRange =
      this.state.schedule === 'interval'
        ? {
            value: this.state.interval.value,
            unit: this.state.interval.unit
          }
        : {
            value: 24,
            unit: 'h'
          };

    return createErrorGroupWatch({
      emails,
      schedule,
      serviceName,
      slackUrl,
      threshold: this.state.threshold,
      timeRange
    })
      .then((id: string) => {
        this.props.onClose();
        this.addSuccessToast(id);
      })
      .catch(e => {
        // tslint:disable-next-line
        console.error(e);
        this.addErrorToast();
      });
  };

  public addErrorToast = () => {
    toastNotifications.addWarning({
      title: 'Watch creation failed',
      text: <p>Make sure your user has permission to create watches.</p>
    });
  };

  public addSuccessToast = (id: string) => {
    toastNotifications.addSuccess({
      title: 'New watch created!',
      text: (
        <p>
          The watch is now ready and will send error reports for{' '}
          {this.props.urlParams.serviceName}.{' '}
          <UnconnectedKibanaLink
            location={this.props.location}
            pathname={'/app/kibana'}
            hash={`/management/elasticsearch/watcher/watches/watch/${id}`}
          >
            View watch.
          </UnconnectedKibanaLink>
        </p>
      )
    });
  };

  public render() {
    if (!this.props.isOpen) {
      return null;
    }

    const userTimezoneSetting = getUserTimezone();
    const dailyTime = this.state.daily;
    const inputTime = `${dailyTime}Z`; // Add tz to make into UTC
    const inputFormat = 'HH:mmZ'; // Parse as 24 hour w. tz
    const dailyTimeFormatted = moment(inputTime, inputFormat)
      .tz(userTimezoneSetting)
      .format('HH:mm'); // Format as 24h
    const dailyTime12HourFormatted = moment(inputTime, inputFormat)
      .tz(userTimezoneSetting)
      .format('hh:mm A (z)'); // Format as 12h w. tz

    // Generate UTC hours for Daily Report select field
    const intervalHours = range(24).map(i => {
      const hour = padLeft(i.toString(), 2, '0');
      return { value: `${hour}:00`, text: `${hour}:00 UTC` };
    });

    const flyoutBody = (
      <EuiText>
        <p>
          This form will assist in creating a Watch that can notify you of error
          occurrences from this service. To learn more about Watcher, please
          read our{' '}
          <EuiLink target="_blank" href={XPACK_DOCS.xpackWatcher}>
            documentation
          </EuiLink>
          .
        </p>

        <EuiForm>
          <h3>Condition</h3>
          <EuiFormRow
            label="Occurrences threshold per error group"
            helpText="Threshold to be met for error group to be included in report."
            compressed
          >
            <EuiFieldNumber
              icon="number"
              min={1}
              value={this.state.threshold}
              onChange={this.onChangeThreshold}
            />
          </EuiFormRow>

          <h3>Trigger schedule</h3>

          <p>
            Choose the time interval for the report, when the threshold is
            exceeded.
          </p>

          <EuiRadio
            id="daily"
            label="Daily report"
            onChange={() => this.onChangeSchedule('daily')}
            checked={this.state.schedule === 'daily'}
          />

          <EuiSpacer size="m" />

          <EuiFormRow
            helpText={`The daily report will be sent at ${dailyTimeFormatted} / ${dailyTime12HourFormatted}.`}
            compressed
          >
            <EuiSelect
              value={dailyTime}
              onChange={this.onChangeDailyUnit}
              options={intervalHours}
              disabled={this.state.schedule !== 'daily'}
            />
          </EuiFormRow>

          <EuiRadio
            id="interval"
            label="Interval"
            onChange={() => this.onChangeSchedule('interval')}
            checked={this.state.schedule === 'interval'}
          />

          <EuiSpacer size="m" />

          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <SmallInput>
                <EuiFormRow
                  helpText="Time interval between reports."
                  compressed
                >
                  <EuiFieldNumber
                    icon="clock"
                    min={1}
                    value={this.state.interval.value}
                    onChange={this.onChangeIntervalValue}
                    disabled={this.state.schedule !== 'interval'}
                  />
                </EuiFormRow>
              </SmallInput>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow compressed>
                <EuiSelect
                  value={this.state.interval.unit}
                  onChange={this.onChangeIntervalUnit}
                  options={[
                    {
                      value: 'm',
                      text: 'mins'
                    },
                    {
                      value: 'h',
                      text: 'hrs'
                    }
                  ]}
                  disabled={this.state.schedule !== 'interval'}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          <h3>Actions</h3>
          <p>
            Reports can be sent by email or posted to a Slack channel. Each
            report will include the top 10 errors sorted by occurrence.
          </p>
          <EuiSwitch
            label="Send email"
            checked={this.state.actions.email}
            onChange={() => this.onChangeAction('email')}
          />

          <EuiSpacer size="m" />
          {this.state.actions.email && (
            <EuiFormRow
              label="Recipients (separated with comma)"
              compressed
              helpText={
                <span>
                  If you have not configured email, please see the{' '}
                  <EuiLink target="_blank" href={XPACK_DOCS.xpackEmails}>
                    documentation
                  </EuiLink>
                  .
                </span>
              }
            >
              <EuiFieldText
                icon="user"
                value={this.state.emails}
                onChange={this.onChangeEmails}
              />
            </EuiFormRow>
          )}

          <EuiSwitch
            label="Send Slack notification"
            checked={this.state.actions.slack}
            onChange={() => this.onChangeAction('slack')}
          />
          <EuiSpacer size="m" />

          {this.state.actions.slack && (
            <EuiFormRow
              label="Slack Webhook URL"
              compressed
              helpText={
                <span>
                  To get a Slack webhook, please see the{' '}
                  <EuiLink
                    target="_blank"
                    href="https://get.slack.help/hc/en-us/articles/115005265063-Incoming-WebHooks-for-Slack"
                  >
                    documentation
                  </EuiLink>
                  .
                </span>
              }
            >
              <EuiFieldText
                icon="link"
                value={this.state.slackUrl}
                onChange={this.onChangeSlackUrl}
              />
            </EuiFormRow>
          )}
        </EuiForm>
      </EuiText>
    );

    return (
      <EuiFlyout onClose={this.props.onClose} size="s">
        <EuiFlyoutHeader>
          <EuiTitle>
            <h2>Enable error reports</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{flyoutBody}</EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiButton
            onClick={this.createWatch}
            fill
            disabled={!this.state.actions.email && !this.state.actions.slack}
          >
            Create watch
          </EuiButton>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}
