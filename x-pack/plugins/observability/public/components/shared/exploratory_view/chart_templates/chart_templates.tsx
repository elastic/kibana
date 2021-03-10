/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiButton,
  EuiTitle,
  EuiCard,
  EuiIcon,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
} from '@elastic/eui';
import { SelectionTabs } from './tabs';

export function ChartTemplates() {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  let flyout;

  if (isFlyoutVisible) {
    flyout = (
      <EuiFlyout size="s" onClose={() => setIsFlyoutVisible(false)} aria-labelledby="flyoutTitle">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="flyoutTitle">Choose chart</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <SelectionTabs />
          <EuiSpacer />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCard
                icon={<EuiIcon size="xxl" type="logoObservability" />}
                title={`Page load distribution`}
                description="Example of a card's description. Stick to one or two sentences."
                href="/app/observability/exploratory-view/page-load-dist"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiCard
                icon={<EuiIcon size="xxl" type="logoLogging" />}
                title={`Page views`}
                description="Example of a card's description. Stick to one or two sentences."
                href="/app/observability/exploratory-view/page-views"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiCard
                icon={<EuiIcon size="xxl" type="logoUptime" />}
                title={`Monitor duration`}
                description="Uptime monitor duration, slice and dice by location etc"
                href="/app/observability/exploratory-view/uptime-duration"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  return (
    <div>
      <EuiButton onClick={() => setIsFlyoutVisible(true)}>Chart templates</EuiButton>
      {flyout}
    </div>
  );
}
