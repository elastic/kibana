/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import moment from 'moment-timezone';
import _ from 'lodash';
import { toastNotifications } from 'ui/notify';
import {
  EuiButton,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiForm,
  EuiFormRow,
  EuiFieldNumber,
  EuiFieldText,
  EuiSwitch,
  EuiSpacer,
  EuiRadio,
  EuiSelect,
  EuiLink
} from '@elastic/eui';

import { XPACK_DOCS } from '../../../../utils/documentation/xpack';

import { KibanaLink } from '../../../../utils/url';
import { createErrorGroupWatch } from './createErrorGroupWatch';
import chrome from 'ui/chrome';

const getUserTimezone = _.memoize(() => {
  const uiSettings = chrome.getUiSettingsClient();
  return uiSettings.get('dateFormat:tz') === 'Browser'
    ? moment.tz.guess()
    : uiSettings.get('dateFormat:tz');
});

function parseNumber(value) {
  return value ? parseInt(value, 10) : '';
}

const SmallInput = styled.div`
  .euiFormRow {
    max-width: 85px;
  }
  .euiFormHelpText {
    width: 200px;
  }
`;

export default class WatcherFlyout extends Component {
  state = {
    schedule: 'daily', // interval | daily
    threshold: 10,
    actions: {
      slack: false,
      email: false
    },
    interval: {
      value: 10,
      unit: 'm' // m | h
    },
    daily: '08:00',
    emails: '',
    slackUrl: ''
  };

  onChangeSchedule = schedule => {
    this.setState({ schedule });
  };

  onChangeThreshold = event => {
    this.setState({
      threshold: parseNumber(event.target.value)
    });
  };

  onChangeDailyUnit = event => {
    this.setState({
      daily: event.target.value
    });
  };

  onChangeIntervalValue = event => {
    this.setState({
      interval: {
        value: parseNumber(event.target.value),
        unit: this.state.interval.unit
      }
    });
  };

  onChangeIntervalUnit = event => {
    this.setState({
      interval: {
        value: this.state.interval.value,
        unit: event.target.value
      }
    });
  };

  onChangeAction = actionName => {
    this.setState({
      actions: {
        ...this.state.actions,
        [actionName]: !this.state.actions[actionName]
      }
    });
  };

  onChangeEmails = event => {
    this.setState({ emails: event.target.value });
  };

  onChangeSlackUrl = event => {
    this.setState({ slackUrl: event.target.value });
  };

  createWatch = () => {
    const emails = this.state.actions.email
      ? this.state.emails
          .split(',')
          .map(email => email.trim())
          .filter(email => !!email)
      : [];

    const slackUrl = this.state.actions.slack ? this.state.slackUrl : null;

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
      serviceName: this.props.serviceName,
      slackUrl,
      threshold: this.state.threshold,
      timeRange
    })
      .then(id => {
        this.props.onClose();
        this.addSuccessToast(id);
      })
      .catch(e => {
        console.error(e);
        this.addErrorToast();
      });
  };

  addErrorToast = () => {
    toastNotifications.addWarning({
      title: 'Watch creation failed',
      text: <p>Make sure your user has permission to create watches.</p>
    });
  };

  addSuccessToast = id => {
    toastNotifications.addSuccess({
      title: 'New watch created!',
      text: (
        <p>
          The watch is now ready and will send error reports for{' '}
          {this.props.serviceName}.{' '}
          <KibanaLink
            pathname={'/app/kibana'}
            hash={`/management/elasticsearch/watcher/watches/watch/${id}`}
          >
            View watch.
          </KibanaLink>
        </p>
      )
    });
  };

  render() {
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
    const intervalHours = _.range(24).map(i => {
      const hour = _.padLeft(i, 2, '0');
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
        <EuiFlyoutFooter
          style={{
            flexDirection: 'row-reverse',
            display: 'flex'
          }}
        >
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

WatcherFlyout.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  serviceName: PropTypes.string,
  onClose: PropTypes.func.isRequired
};
