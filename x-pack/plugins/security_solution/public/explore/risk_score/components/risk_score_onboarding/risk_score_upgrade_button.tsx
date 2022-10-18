/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiConfirmModal } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useKibana } from '../../../../common/lib/kibana';
import type { inputsModel } from '../../../../common/store';
import { upgradeHostRiskScoreModule, upgradeUserRiskScoreModule } from './utils';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { useRiskScoreToastContent } from './use_risk_score_toast_content';
import { REQUEST_NAMES, useFetch } from '../../../../common/hooks/use_fetch';
import { RiskScoreDocLink } from './risk_score_doc_link';

const RiskScoreUpgradeButtonComponent = ({
  disabled,
  refetch,
  riskScoreEntity,
  timerange,
  title,
}: {
  disabled?: boolean;
  refetch: inputsModel.Refetch;
  riskScoreEntity: RiskScoreEntity;
  timerange: {
    from: string;
    to: string;
  };
  title: string;
}) => {
  const spaceId = useSpaceId();
  const { http, notifications, theme, dashboard } = useKibana().services;
  const { renderDocLink, renderDashboardLink } = useRiskScoreToastContent(riskScoreEntity);
  const { fetch, isLoading } = useFetch(
    REQUEST_NAMES.UPGRADE_RISK_SCORE,
    riskScoreEntity === RiskScoreEntity.user
      ? upgradeUserRiskScoreModule
      : upgradeHostRiskScoreModule
  );
  const [isModalVisible, setIsModalVisible] = useState(false);
  const closeModal = useCallback(() => setIsModalVisible(false), []);
  const showModal = useCallback(() => setIsModalVisible(true), []);
  const upgradeRiskScore = useCallback(async () => {
    closeModal();
    fetch({
      http,
      notifications,
      spaceId,
      timerange,
      refetch,
      renderDashboardLink,
      renderDocLink,
      riskScoreEntity,
      theme,
      dashboard,
    });
  }, [
    closeModal,
    fetch,
    http,
    notifications,
    spaceId,
    timerange,
    refetch,
    renderDashboardLink,
    renderDocLink,
    riskScoreEntity,
    theme,
    dashboard,
  ]);

  return (
    <>
      <EuiButton
        color="primary"
        data-test-subj={`${riskScoreEntity}-risk-score-upgrade`}
        disabled={disabled}
        fill
        isLoading={isLoading}
        onClick={showModal}
      >
        {title}
      </EuiButton>
      {isModalVisible && (
        <EuiConfirmModal
          data-test-subj={`${riskScoreEntity}-risk-score-upgrade-confirmation-modal`}
          title={title}
          onCancel={closeModal}
          onConfirm={upgradeRiskScore}
          cancelButtonText={
            <RiskScoreDocLink
              riskScoreEntity={riskScoreEntity}
              title={
                <FormattedMessage
                  id="xpack.securitySolution.riskScore.upgradeConfirmation.cancel"
                  defaultMessage="Preserve data"
                />
              }
            />
          }
          confirmButtonText={
            <FormattedMessage
              data-test-subj={`${riskScoreEntity}-risk-score-upgrade-confirmation-button`}
              id="xpack.securitySolution.riskScore.upgradeConfirmation.confirm"
              defaultMessage="Erase data and Upgrade"
            />
          }
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <FormattedMessage
            id="xpack.securitySolution.riskScore.upgradeConfirmation.content"
            defaultMessage="The upgrade will delete existing risk scores from your environment. You may preserve existing risk data before upgrading the Risk Score package. Do you wish to upgrade?"
          />
        </EuiConfirmModal>
      )}
    </>
  );
};

export const RiskScoreUpgradeButton = React.memo(RiskScoreUpgradeButtonComponent);
RiskScoreUpgradeButton.displayName = 'RiskScoreUpgradeButton';
