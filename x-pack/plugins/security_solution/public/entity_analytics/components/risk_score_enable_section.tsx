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
import {
  DETECTION_ENTITY_DASHBOARD,
  RISKY_HOSTS_DOC_LINK,
  RISKY_USERS_DOC_LINK,
} from '../../../common/constants';
import * as i18n from '../translations';
import { useRiskEningeStatus } from '../api/hooks/use_risk_engine_status';

const docsLinks = [
  {
    link: DETECTION_ENTITY_DASHBOARD,
    label: i18n.EA_DOCS_DASHBOARD,
  },
  {
    link: RISKY_HOSTS_DOC_LINK,
    label: i18n.EA_DOCS_RISK_HOSTS,
  },
  {
    link: RISKY_USERS_DOC_LINK,
    label: i18n.EA_DOCS_RISK_USERS,
  },
];

const MIN_WIDTH_TO_PREVENT_LABEL_FROM_MOVING = '50px';

export const RiskScoreEnableSection = () => {
  const [checked, setChecked] = useState(false);
  const { data: riskEngineStatus, isLoading, isError } = useRiskEningeStatus();
  console.log('riskEngineStatus', riskEngineStatus);

  return (
    <>
      <>
        <EuiTitle>
          <h2>{i18n.RISK_SCORE_MODULE_STATUS}</h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexItem grow={0}>
          <EuiHorizontalRule margin="s" />
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>{i18n.ENTITY_RISK_SCORING}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems={'center'}>
                <EuiFlexItem css={{ minWidth: MIN_WIDTH_TO_PREVENT_LABEL_FROM_MOVING }}>
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
          {docsLinks.map(({ link, label }) => (
            <li key={link}>
              <EuiLink href={link} target="_blank" external>
                {label}
              </EuiLink>
              <EuiSpacer size="s" />
            </li>
          ))}
        </ul>
      </>
    </>
  );
};
