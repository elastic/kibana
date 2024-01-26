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
  EuiBetaBadge,
  useEuiTheme,
  EuiLink,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

import * as i18n from './translations';
import { useOnOpenCloseHandler } from '../../../helper_hooks';
import { RiskScoreLevel } from '../severity/common';
import { RiskScoreEntity, RiskSeverity } from '../../../../common/search_strategy';
import { RiskScoreDocLink } from '../risk_score_onboarding/risk_score_doc_link';
import { BETA } from '../risk_score_onboarding/translations';

const getTableColumns = (riskEntity?: RiskScoreEntity): Array<EuiBasicTableColumn<TableItem>> => [
  {
    field: 'level',
    name: i18n.INFORMATION_LEVEL_HEADER,
    render: (riskScore?: RiskSeverity) => {
      if (riskScore != null) {
        return <RiskScoreLevel severity={riskScore} hideBackgroundColor />;
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
  level: RiskSeverity;
}

const tableItems: TableItem[] = [
  { level: RiskSeverity.critical, range: i18n.CRITICAL_RISK_DESCRIPTION },
  { level: RiskSeverity.high, range: '70 - 90 ' },
  { level: RiskSeverity.moderate, range: '40 - 70' },
  { level: RiskSeverity.low, range: '20 - 40' },
  { level: RiskSeverity.unknown, range: i18n.UNKNOWN_RISK_DESCRIPTION },
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
      {isFlyoutVisible && <RiskInformationFlyout handleOnClose={handleOnClose} />}
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
      {isFlyoutVisible && <RiskInformationFlyout handleOnClose={handleOnClose} />}
    </>
  );
};

export const RiskInformationFlyout = ({ handleOnClose }: { handleOnClose: () => void }) => {
  const { euiTheme } = useEuiTheme();
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
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id={simpleFlyoutTitleId}>{i18n.TITLE}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              label={BETA}
              size="s"
              css={css`
                color: ${euiTheme.colors.text};
                margin-top: ${euiTheme.size.xxs};
              `}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.securitySolution.riskInformation.introText"
              defaultMessage="Entity Risk Analytics surfaces risky hosts and users from within your environment."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.riskInformation.riskScoreFieldText"
              defaultMessage="The {riskScoreField} field represents the normalized risk of the Entity as a single numerical value. You can use this value as a relative indicator of risk in triaging and response playbooks."
              values={{
                riskScoreField: (
                  <b>
                    <FormattedMessage
                      id="xpack.securitySolution.riskInformation.riskScoreFieldLabel"
                      defaultMessage="Entity risk score"
                    />
                  </b>
                ),
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.riskInformation.riskScoreLevelText"
              defaultMessage="The {riskLevelField} field represents one of the six risk level of
              the Entity based on a predefined risk metrics."
              values={{
                riskLevelField: (
                  <b>
                    <FormattedMessage
                      id="xpack.securitySolution.riskInformation.riskScoreLevelLabel"
                      defaultMessage="Entity risk level"
                    />
                  </b>
                ),
              }}
            />
          </p>
          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.riskInformation.howOftenTitle"
                defaultMessage="How often is risk calculated?"
              />
            </h3>
          </EuiTitle>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.riskInformation.howOftenText"
              defaultMessage="The risk engine runs hourly and aggregates alerts with an “open” status from the last 30
              days."
            />
          </p>
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.riskInformation.howCalculatedTitle"
                defaultMessage="How is risk calculated?"
              />
            </h3>
          </EuiTitle>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.riskInformation.howCalculatedText"
              defaultMessage="The Entity Risk engine runs hourly to aggregate “Open” and “Acknowledged” alerts from the last 30 days and assigns risk score to the host or user. It then aggregates the individual
              risk scores and normalizes to the 0-100 range using the {riemannZetaLink}."
              values={{
                riemannZetaLink: (
                  <EuiLink
                    target="_blank"
                    rel="noopener nofollow noreferrer"
                    href="https://en.wikipedia.org/wiki/Riemann_zeta_function"
                  >
                    {'Riemann Zeta function'}
                  </EuiLink>
                ),
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.riskInformation.intro"
              defaultMessage="Finally, the engine assigns a risk level by mapping the normalized risk score to the
            below 5 risk levels."
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiBasicTable
          columns={getTableColumns()}
          items={tableItems}
          data-test-subj="risk-information-table"
        />
        <EuiSpacer size="l" />
        <RiskScoreDocLink
          title={
            <FormattedMessage
              id="xpack.securitySolution.riskInformation.learnMore"
              defaultMessage="Learn more about Entity risk"
            />
          }
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton onClick={handleOnClose}>{i18n.CLOSE_BUTTON_TEXT}</EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
