/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import * as i18n from '../translations';

export const RiskScoreEnableSection = () => {
  const [checked, setChecked] = useState(false);

  return (
    <>
      <>
        <EuiTitle>
          <h2>{i18n.RISK_SCORE_MODULE_STATUS}</h2>
        </EuiTitle>

        <EuiFlexItem grow={0}>
          <EuiHorizontalRule margin="s" />
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>{i18n.ENTITY_RISK_SCORING}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems={'center'}>
                <EuiFlexItem css={{ minWidth: '50px' }}>
                  {checked ? (
                    <EuiHealth color="success">{i18n.RISK_SCORE_MODULE_STATUS_ON}</EuiHealth>
                  ) : (
                    <EuiHealth color="subdued">{i18n.RISK_SCORE_MODULE_STATUS_OFF}</EuiHealth>
                  )}
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiSwitch
                    label={''}
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                    compressed
                    aria-describedby={'switchRiskModule'}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="s" />
        </EuiFlexItem>
      </>
      <EuiSpacer />
      <>
        <EuiTitle>
          <h2>{i18n.USEFUL_LINKS}</h2>
        </EuiTitle>
        <EuiSpacer />
        <ul>
          <li>
            <EuiLink
              href="https://www.elastic.co/guide/en/security/current/detection-entity-dashboard.html"
              target="_blank"
              external
            >
              {i18n.EA_DOCS}
            </EuiLink>
          </li>
        </ul>
      </>
    </>
  );
};
