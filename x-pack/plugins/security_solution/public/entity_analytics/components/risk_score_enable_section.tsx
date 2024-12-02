/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  EuiLoadingSpinner,
  EuiText,
  EuiCallOut,
  EuiAccordion,
} from '@elastic/eui';
import { LinkAnchor } from '@kbn/security-solution-navigation/links';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import type { RiskEngineStatus } from '../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';
import { RiskEngineStatusEnum } from '../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';
import * as i18n from '../translations';
import { useRiskEngineStatus } from '../api/hooks/use_risk_engine_status';
import { useInitRiskEngineMutation } from '../api/hooks/use_init_risk_engine_mutation';
import { useEnableRiskEngineMutation } from '../api/hooks/use_enable_risk_engine_mutation';
import { useDisableRiskEngineMutation } from '../api/hooks/use_disable_risk_engine_mutation';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import { RiskInformationFlyout } from './risk_information';
import { useOnOpenCloseHandler } from '../../helper_hooks';
import type { RiskEngineMissingPrivilegesResponse } from '../hooks/use_missing_risk_engine_privileges';

const MIN_WIDTH_TO_PREVENT_LABEL_FROM_MOVING = '50px';
const toastOptions = {
  toastLifeTimeMs: 5000,
};

const RiskScoreErrorPanel = ({ errors }: { errors: string[] }) => (
  <>
    <EuiSpacer size="m" />
    <EuiCallOut
      title={i18n.ERROR_PANEL_TITLE}
      color="danger"
      iconType="error"
      data-test-subj="risk-score-error-panel"
    >
      <p>{i18n.ERROR_PANEL_MESSAGE}</p>

      <EuiAccordion id="risk-engine-erros" buttonContent={i18n.ERROR_PANEL_ERRORS}>
        <>
          {errors.map((error) => (
            <div key={error}>
              <EuiText size="s">{error}</EuiText>
              <EuiSpacer size="s" />
            </div>
          ))}
        </>
      </EuiAccordion>
    </EuiCallOut>
  </>
);

const RiskEngineHealth: React.FC<{ currentRiskEngineStatus?: RiskEngineStatus | null }> = ({
  currentRiskEngineStatus,
}) => {
  if (!currentRiskEngineStatus) {
    return <EuiHealth color="subdued">{'-'}</EuiHealth>;
  }
  if (currentRiskEngineStatus === RiskEngineStatusEnum.ENABLED) {
    return <EuiHealth color="success">{i18n.RISK_ENGINE_STATUS_ON}</EuiHealth>;
  }
  return <EuiHealth color="subdued">{i18n.RISK_ENGINE_STATUS_OFF}</EuiHealth>;
};

const RiskEngineStatusRow: React.FC<{
  currentRiskEngineStatus?: RiskEngineStatus | null;
  onSwitchClick: () => void;
  isLoading: boolean;
  privileges: RiskEngineMissingPrivilegesResponse;
}> = ({ currentRiskEngineStatus, onSwitchClick, isLoading, privileges }) => {
  const userHasRequiredPrivileges =
    'hasAllRequiredPrivileges' in privileges && privileges.hasAllRequiredPrivileges;
  const btnIsDisabled = !currentRiskEngineStatus || isLoading || !userHasRequiredPrivileges;

  return (
    <EuiFlexGroup gutterSize="s" alignItems={'center'}>
      {isLoading && (
        <EuiFlexItem>
          <EuiLoadingSpinner data-test-subj="risk-score-status-loading" size="m" />
        </EuiFlexItem>
      )}
      <EuiFlexItem
        css={{ minWidth: MIN_WIDTH_TO_PREVENT_LABEL_FROM_MOVING }}
        data-test-subj="risk-score-status"
      >
        <RiskEngineHealth currentRiskEngineStatus={currentRiskEngineStatus} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSwitch
          label={''}
          data-test-subj="risk-score-switch"
          checked={currentRiskEngineStatus === RiskEngineStatusEnum.ENABLED}
          onChange={onSwitchClick}
          compressed
          disabled={btnIsDisabled}
          aria-describedby={'switchRiskModule'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const RiskScoreEnableSection: React.FC<{
  privileges: RiskEngineMissingPrivilegesResponse;
}> = ({ privileges }) => {
  const { addSuccess } = useAppToasts();
  const { data: riskEngineStatus, isFetching: isStatusLoading } = useRiskEngineStatus();
  const initRiskEngineMutation = useInitRiskEngineMutation({
    onSuccess: () => {
      addSuccess(i18n.RISK_ENGINE_TURNED_ON, toastOptions);
    },
  });

  const enableRiskEngineMutation = useEnableRiskEngineMutation({
    onSuccess: () => {
      addSuccess(i18n.RISK_ENGINE_TURNED_ON, toastOptions);
    },
  });
  const disableRiskEngineMutation = useDisableRiskEngineMutation({
    onSuccess: () => {
      addSuccess(i18n.RISK_ENGINE_TURNED_OFF, toastOptions);
    },
  });

  const currentRiskEngineStatus = riskEngineStatus?.risk_engine_status;

  const [isFlyoutVisible, handleOnOpen, handleOnClose] = useOnOpenCloseHandler();

  const isLoading =
    initRiskEngineMutation.isLoading ||
    enableRiskEngineMutation.isLoading ||
    disableRiskEngineMutation.isLoading ||
    privileges.isLoading ||
    isStatusLoading;

  const onSwitchClick = () => {
    if (!currentRiskEngineStatus || isLoading) {
      return;
    }

    if (currentRiskEngineStatus === RiskEngineStatusEnum.NOT_INSTALLED) {
      initRiskEngineMutation.mutate();
    } else if (currentRiskEngineStatus === RiskEngineStatusEnum.ENABLED) {
      disableRiskEngineMutation.mutate();
    } else if (currentRiskEngineStatus === RiskEngineStatusEnum.DISABLED) {
      enableRiskEngineMutation.mutate();
    }
  };

  let initRiskEngineErrors: string[] = [];
  if (initRiskEngineMutation.isError) {
    const errorBody = initRiskEngineMutation.error.body;
    initRiskEngineErrors = [errorBody.message];
  }
  return (
    <>
      <>
        <EuiTitle>
          <h2>{i18n.RISK_ENGINE_STATUS}</h2>
        </EuiTitle>
        {initRiskEngineMutation.isError && <RiskScoreErrorPanel errors={initRiskEngineErrors} />}
        {disableRiskEngineMutation.isError && (
          <RiskScoreErrorPanel errors={[disableRiskEngineMutation.error.body.message]} />
        )}
        {enableRiskEngineMutation.isError && (
          <RiskScoreErrorPanel errors={[enableRiskEngineMutation.error.body.message]} />
        )}

        <EuiSpacer size="m" />
        <EuiFlexItem grow={0}>
          <EuiHorizontalRule margin="s" />

          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems={'baseline'}>
                {i18n.ENTITY_RISK_SCORING}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <RiskEngineStatusRow
                currentRiskEngineStatus={currentRiskEngineStatus}
                onSwitchClick={onSwitchClick}
                isLoading={isLoading}
                privileges={privileges}
              />
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
            <LinkAnchor id={SecurityPageName.entityAnalytics}>{i18n.EA_DASHBOARD_LINK}</LinkAnchor>
            <EuiSpacer size="s" />
          </li>
          <li>
            <EuiLink onClick={handleOnOpen} data-test-subj="open-risk-information-flyout-trigger">
              {i18n.EA_DOCS_ENTITY_RISK_SCORE}
            </EuiLink>
            {isFlyoutVisible && <RiskInformationFlyout handleOnClose={handleOnClose} />}
            <EuiSpacer size="s" />
          </li>
        </ul>
      </>
    </>
  );
};
