/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { getRiskEntityTranslation } from '../translations';
import * as i18n from './translations';
import { useOnOpenCloseHandler } from '../../../../helper_hooks';
import { RiskScore } from '../severity/common';
import { RiskScoreEntity, RiskSeverity } from '../../../../../common/search_strategy';
import { RiskScoreDocLink } from '../risk_score_onboarding/risk_score_doc_link';

const getTableColumns = (riskEntity: RiskScoreEntity): Array<EuiBasicTableColumn<TableItem>> => [
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
    name: i18n.INFORMATION_RISK_HEADER(riskEntity),
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
export const HOST_RISK_INFO_BUTTON_CLASS = 'HostRiskInformation__button';
export const USER_RISK_INFO_BUTTON_CLASS = 'UserRiskInformation__button';

export const RiskInformationButtonIcon = ({ riskEntity }: { riskEntity: RiskScoreEntity }) => {
  const [isFlyoutVisible, handleOnOpen, handleOnClose] = useOnOpenCloseHandler();

  return (
    <>
      <EuiButtonIcon
        size="xs"
        iconSize="m"
        iconType="iInCircle"
        aria-label={i18n.INFORMATION_ARIA_LABEL}
        onClick={handleOnOpen}
        className={
          riskEntity === RiskScoreEntity.host
            ? HOST_RISK_INFO_BUTTON_CLASS
            : USER_RISK_INFO_BUTTON_CLASS
        }
        data-test-subj="open-risk-information-flyout-trigger"
      />
      {isFlyoutVisible && (
        <RiskInformationFlyout riskEntity={riskEntity} handleOnClose={handleOnClose} />
      )}
    </>
  );
};

export const RiskInformationButtonEmpty = ({ riskEntity }: { riskEntity: RiskScoreEntity }) => {
  const [isFlyoutVisible, handleOnOpen, handleOnClose] = useOnOpenCloseHandler();

  return (
    <>
      <EuiButtonEmpty onClick={handleOnOpen} data-test-subj="open-risk-information-flyout-trigger">
        {i18n.INFO_BUTTON_TEXT}
      </EuiButtonEmpty>
      {isFlyoutVisible && (
        <RiskInformationFlyout riskEntity={riskEntity} handleOnClose={handleOnClose} />
      )}
    </>
  );
};

const RiskInformationFlyout = ({
  handleOnClose,
  riskEntity,
}: {
  handleOnClose: () => void;
  riskEntity: RiskScoreEntity;
}) => {
  const simpleFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'RiskInformation',
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
          <h2 id={simpleFlyoutTitleId}>{i18n.TITLE(riskEntity)}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>{i18n.INTRODUCTION(riskEntity)}</p>
          <p>{i18n.EXPLANATION_MESSAGE(riskEntity)}</p>
        </EuiText>
        <EuiSpacer />
        <EuiBasicTable
          columns={getTableColumns(riskEntity)}
          items={tableItems}
          data-test-subj="risk-information-table"
        />
        <EuiSpacer size="l" />
        <FormattedMessage
          id="xpack.securitySolution.riskInformation.learnMore"
          defaultMessage="You can learn more about {riskEntity} risk {riskScoreDocumentationLink}"
          values={{
            riskScoreDocumentationLink: (
              <RiskScoreDocLink
                riskScoreEntity={riskEntity}
                title={
                  <FormattedMessage
                    id="xpack.securitySolution.riskInformation.link"
                    defaultMessage="here"
                  />
                }
              />
            ),
            riskEntity: getRiskEntityTranslation(riskEntity, true),
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
