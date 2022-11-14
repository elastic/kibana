/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  useGeneratedHtmlId,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiButton,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import * as i18n from './translations';
import { useOnOpenCloseHandler } from '../../../helper_hooks';
import { RiskScore } from '../../../common/components/severity/common';
import { RiskScoreEntity, RiskSeverity } from '../../../../common/search_strategy';
import { RiskScoreDocLink } from '../../../common/components/risk_score/risk_score_onboarding/risk_score_doc_link';

const tableColumns: Array<EuiBasicTableColumn<TableItem>> = [
  {
    field: 'classification',
    name: i18n.INFORMATION_CLASSIFICATION_HEADER,
    render: (riskScore?: RiskSeverity) => {
      if (riskScore != null) {
        return <RiskScore severity={riskScore} hideBackgroundColor />;
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
  classification: RiskSeverity;
}

const tableItems: TableItem[] = [
  { classification: RiskSeverity.critical, range: i18n.CRITICAL_RISK_DESCRIPTION },
  { classification: RiskSeverity.high, range: '70 - 90 ' },
  { classification: RiskSeverity.moderate, range: '40 - 70' },
  { classification: RiskSeverity.low, range: '20 - 40' },
  { classification: RiskSeverity.unknown, range: i18n.UNKNOWN_RISK_DESCRIPTION },
];

export const UserRiskInformationButtonEmpty = () => {
  const [isFlyoutVisible, handleOnOpen, handleOnClose] = useOnOpenCloseHandler();

  return (
    <>
      <EuiButtonEmpty onClick={handleOnOpen} data-test-subj="open-risk-information-flyout-trigger">
        {i18n.INFO_BUTTON_TEXT}
      </EuiButtonEmpty>
      {isFlyoutVisible && <UserRiskInformationFlyout handleOnClose={handleOnClose} />}
    </>
  );
};

const UserRiskInformationFlyout = ({ handleOnClose }: { handleOnClose: () => void }) => {
  const simpleFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'UserRiskInformation',
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
          id="xpack.securitySolution.users.userRiskInformation.learnMore"
          defaultMessage="You can learn more about user risk {UserRiskScoreDocumentationLink}"
          values={{
            UserRiskScoreDocumentationLink: (
              <RiskScoreDocLink
                riskScoreEntity={RiskScoreEntity.user}
                title={
                  <FormattedMessage
                    id="xpack.securitySolution.users.userRiskInformation.link"
                    defaultMessage="here"
                  />
                }
              />
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
