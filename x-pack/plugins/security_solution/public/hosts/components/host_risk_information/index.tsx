/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  useGeneratedHtmlId,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
  EuiLink,
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiButton,
  EuiSpacer,
  EuiBasicTableColumn,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { HostRiskSeverity } from '../../../../common/search_strategy';
import { RISKY_HOSTS_DOC_LINK } from '../../../overview/components/overview_risky_host_links/risky_hosts_disabled_module';
import { HostRiskScore } from '../common/host_risk_score';
import * as i18n from './translations';

const tableColumns: Array<EuiBasicTableColumn<TableItem>> = [
  {
    field: 'classification',
    name: i18n.INFORMATION_CLASSIFICATION_HEADER,
    render: (riskScore?: HostRiskSeverity) => {
      if (riskScore != null) {
        return <HostRiskScore severity={riskScore} hideBackgroundColor />;
      }
    },
  },
  {
    field: 'range',
    name: i18n.INFORMATION_RISK_HEADER,
  },
];

interface TableItem {
  range?: string;
  classification: HostRiskSeverity;
}

const tableItems: TableItem[] = [
  { classification: HostRiskSeverity.critical, range: '90 and above' },
  { classification: HostRiskSeverity.high, range: '70 - 90 ' },
  { classification: HostRiskSeverity.moderate, range: '40 - 70' },
  { classification: HostRiskSeverity.low, range: '20 - 40' },
  { classification: HostRiskSeverity.unknown, range: 'Less than 20' },
];

export const HOST_RISK_INFO_BUTTON_CLASS = 'HostRiskInformation__button';

export const HostRiskInformation = () => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const simpleFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'HostRiskInformation',
  });

  let flyout;

  if (isFlyoutVisible) {
    flyout = (
      <EuiFlyout
        ownFocus
        onClose={() => setIsFlyoutVisible(false)}
        aria-labelledby={simpleFlyoutTitleId}
        size={450}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={simpleFlyoutTitleId}>
              <FormattedMessage
                id="xpack.securitySolution.hosts.hostRiskInformation.title"
                defaultMessage="How is host risk calculated?"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.securitySolution.hosts.hostRiskInformation.introduction"
                defaultMessage="The Host Risk Score capability surfaces risky hosts from within your environment."
              />
            </p>
            <p>
              <FormattedMessage
                id="xpack.securitySolution.hosts.hostRiskInformation.explanation"
                defaultMessage='This feature utilizes a transform, with a scripted metric aggregation to calculate
                host risk scores based on detection rule alerts with an "open" status, within a 5 day
                time window. The transform runs hourly to keep the score updated as new detection rule
                alerts stream in.'
              />
            </p>
          </EuiText>
          <EuiSpacer />
          <EuiBasicTable
            columns={tableColumns}
            items={tableItems}
            data-test-subj="risk-information-table"
          />
          <EuiSpacer size="l" />
          <FormattedMessage
            id="xpack.securitySolution.hosts.hostRiskInformation.learnMore"
            defaultMessage="You can learn more about host risk {hostsRiskScoreDocumentationLink}"
            values={{
              hostsRiskScoreDocumentationLink: (
                <EuiLink href={RISKY_HOSTS_DOC_LINK} target="_blank">
                  <FormattedMessage
                    id="xpack.securitySolution.hosts.hostRiskInformation.link"
                    defaultMessage="here"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton onClick={() => setIsFlyoutVisible(false)}>
                <FormattedMessage
                  id="xpack.securitySolution.hosts.hostRiskInformation.closeBtn"
                  defaultMessage="Close"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }

  return (
    <>
      <EuiButtonIcon
        size="xs"
        iconSize="m"
        iconType="iInCircle"
        aria-label={i18n.INFORMATION_ARIA_LABEL}
        onClick={() => setIsFlyoutVisible(true)}
        className={HOST_RISK_INFO_BUTTON_CLASS}
        data-test-subj="open-risk-information-flyout"
      />
      {flyout}
    </>
  );
};
