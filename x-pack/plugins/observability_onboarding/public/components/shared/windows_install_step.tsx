/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from "@elastic/eui";
import { i18n } from "@kbn/i18n";
import React from "react";

export function WindowsInstallStep() {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiText color="subdued">
          <p>
            {i18n.translate(
              'xpack.observability_onboarding.windows.installStep.description',
              { defaultMessage: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.' }
            )}
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          iconSide="right"
          iconType="popout"
          color="primary"
          href="https://www.elastic.co/guide/en/fleet/current/install-standalone-elastic-agent.html"
          target="_blank"
          style={{ width: 'fit-content' }}
        >
          {i18n.translate(
            'xpack.observability_onboarding.windows.installStep.link.label',
            { defaultMessage: 'Read docs' }
          )}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
