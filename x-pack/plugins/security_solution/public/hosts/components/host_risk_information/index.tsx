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
  EuiButtonEmpty,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState, useCallback, memo } from 'react';
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
  { classification: HostRiskSeverity.critical, range: i18n.CRITICAL_RISK_DESCRIPTION },
  { classification: HostRiskSeverity.high, range: '70 - 90 ' },
  { classification: HostRiskSeverity.moderate, range: '40 - 70' },
  { classification: HostRiskSeverity.low, range: '20 - 40' },
  { classification: HostRiskSeverity.unknown, range: i18n.UNKNOWN_RISK_DESCRIPTION },
];

export const HOST_RISK_INFO_BUTTON_CLASS = 'HostRiskInformation__button';

export const HostRiskInformationButtonIcon = memo(() => {
  const [isFlyoutVisible, handleOnOpen, handleOnClose] = useOnOpenCloseHandler();

  return (
    <>
      <EuiButtonIcon
        size="xs"
        iconSize="m"
        iconType="iInCircle"
        aria-label={i18n.INFORMATION_ARIA_LABEL}
        onClick={handleOnOpen}
        className={HOST_RISK_INFO_BUTTON_CLASS}
        data-test-subj="open-risk-information-flyout-trigger"
      />
      {isFlyoutVisible && <HostRiskInformationFlyout handleOnClose={handleOnClose} />}
    </>
  );
});
HostRiskInformationButtonIcon.displayName = 'HostRiskInformationButtonIcon';

export const HostRiskInformationButtonEmpty = memo(() => {
  const [isFlyoutVisible, handleOnOpen, handleOnClose] = useOnOpenCloseHandler();

  return (
    <>
      <EuiButtonEmpty onClick={handleOnOpen} data-test-subj="open-risk-information-flyout-trigger">
        {i18n.INFO_BUTTON_TEXT}
      </EuiButtonEmpty>
      {isFlyoutVisible && <HostRiskInformationFlyout handleOnClose={handleOnClose} />}
    </>
  );
});
HostRiskInformationButtonEmpty.displayName = 'HostRiskInformationButtonEmpty';

const useOnOpenCloseHandler = (): [boolean, () => void, () => void] => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOnClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleOnOpen = useCallback(() => {
    setIsOpen(true);
  }, []);
  return [isOpen, handleOnOpen, handleOnClose];
};

const HostRiskInformationFlyout = ({ handleOnClose }: { handleOnClose: () => void }) => {
  const simpleFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'HostRiskInformation',
  });

  return (
    <EuiFlyout
      ownFocus
      onClose={handleOnClose}
      aria-labelledby={simpleFlyoutTitleId}
      size={450}
      data-test-subj="open-risk-information-flyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={simpleFlyoutTitleId}>{i18n.TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>{i18n.INTRODUCTION}</p>
          <p>{i18n.EXPLANATION_MESSAGE}</p>
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
            <EuiButton onClick={handleOnClose}>{i18n.CLOSE_BUTTON_LTEXT}</EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
