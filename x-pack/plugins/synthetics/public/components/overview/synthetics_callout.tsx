/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const SYNTHETICS_CALLOUT_LS_KEY = 'xpack.uptime.syntheticsCallout.display';
const shouldShowSyntheticsCallout = () => {
  let value = localStorage.getItem(SYNTHETICS_CALLOUT_LS_KEY);
  if (value === null) {
    localStorage.setItem(SYNTHETICS_CALLOUT_LS_KEY, 'true');
    value = 'true';
  }
  return value === 'true';
};
const hideSyntheticsCallout = () => localStorage.setItem(SYNTHETICS_CALLOUT_LS_KEY, 'false');

export const SyntheticsCallout = () => {
  const [shouldShow, setShouldShow] = useState<boolean>(shouldShowSyntheticsCallout());
  if (!shouldShow) {
    return null;
  }
  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.uptime.overview.pageHeader.syntheticsCallout.title', {
          defaultMessage: 'Elastic Synthetics',
        })}
        iconType="beaker"
      >
        <p>
          <FormattedMessage
            id="xpack.uptime.overview.pageHeader.syntheticsCallout.content"
            defaultMessage="Uptime is now previewing support for scripted multi-step availability checks. This means you can interact with elements of a webpage and check the availability of an entire journey (such as making a purchase or signing into a system) instead of just a simple single page up/down check. Please click below to read more and, if you'd like to be one of the first to use these capabilities, you can download our preview synthetics agent and view your synthetic checks in Uptime."
          />
        </p>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton href="https://www.elastic.co/what-is/synthetic-monitoring">
              <FormattedMessage
                id="xpack.uptime.overview.pageHeader.syntheticsCallout.announcementLink"
                defaultMessage="Read announcement"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="uptimeDismissSyntheticsCallout"
              onClick={() => {
                if (shouldShow) {
                  hideSyntheticsCallout();
                  setShouldShow(false);
                }
              }}
            >
              <FormattedMessage
                id="xpack.uptime.overview.pageHeader.syntheticsCallout.dismissButtonText"
                defaultMessage="Dismiss"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
    </>
  );
};
