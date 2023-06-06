/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiSpacer, EuiText } from '@elastic/eui';

export function RulesHelp() {
  return (
    <>
      <EuiText>
        <p>
          <FormattedMessage
            id="rules.welcomePage.quickIntroDescription"
            defaultMessage="Rules detect complex conditions and trigger actions when those conditions are met."
          />
        </p>
        <p>
          <FormattedMessage
            id="rules.welcomePage.componentsDescription"
            defaultMessage="A rule consists of three main parts:"
          />
          <ul>
            <li>
              <FormattedMessage
                id="rules.welcomePage.components.conditions"
                defaultMessage="{conditionsText}: What needs to be detected?"
                values={{
                  conditionsText: <i>Conditions</i>,
                }}
              />
            </li>
            <li>
              <FormattedMessage
                id="rules.welcomePage.components.schedule"
                defaultMessage="{scheduleText}: How often should detection checks run?"
                values={{
                  scheduleText: <i>Schedule</i>,
                }}
              />
            </li>
            <li>
              <FormattedMessage
                id="rules.welcomePage.components.actions"
                defaultMessage="{actionsText}: What happens when a condition is detected?"
                values={{
                  actionsText: <i>Actions</i>,
                }}
              />
            </li>
          </ul>
        </p>
        <h4>
          <FormattedMessage id="rules.welcomePage.conditions" defaultMessage="Conditions" />
        </h4>
        <p>
          <FormattedMessage
            id="console.welcomePage.conditionsDescription1"
            defaultMessage="Kibana rules have the flexibility to support a wide range of conditions, anything from the results of a simple Elasticsearch query to heavy computations involving data from multiple sources or external systems."
          />
        </p>
        <p>
          <FormattedMessage
            id="console.welcomePage.conditionsExample"
            defaultMessage="For example, you can create a rule that checks for average CPU usage that is greater than 90% on each server for the last two minutes."
          />
        </p>
        <h4>
          <FormattedMessage id="rules.welcomePage.schedule" defaultMessage="Schedule" />
        </h4>
        <p>
          <FormattedMessage
            id="console.welcomePage.scheduleDescription"
            defaultMessage="A rule's schedule is the approximate interval between its checks. It can range from a few seconds to months."
          />
        </p>
        <p>
          <FormattedMessage
            id="console.welcomePage.scheduleExample"
            defaultMessage="For example, your rule can check its conditions every minute."
          />
        </p>
        <h4>
          <FormattedMessage id="rules.welcomePage.actions" defaultMessage="Actions" />
        </h4>
        <p>
          <FormattedMessage
            id="console.welcomePage.actionDescription"
            defaultMessage="You can add one or more actions to your rule to generate notifications when its conditions are met and when they are no longer met."
          />
        </p>
        <p>
          <FormattedMessage
            id="console.welcomePage.actionExample"
            defaultMessage="For example, your rule can send a warning email message that indicates which server has high CPU usage."
          />
        </p>
      </EuiText>
      <EuiSpacer size="l" />
    </>
  );
}
