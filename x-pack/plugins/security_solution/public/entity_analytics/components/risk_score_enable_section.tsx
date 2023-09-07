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
  EuiLoadingSpinner,
  EuiBadge,
  EuiButtonEmpty,
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  EuiCallOut,
  EuiAccordion,
} from '@elastic/eui';
import {
  DETECTION_ENTITY_DASHBOARD,
  RISKY_HOSTS_DOC_LINK,
  RISKY_USERS_DOC_LINK,
} from '../../../common/constants';
import * as i18n from '../translations';
import { useRiskEngineStatus } from '../api/hooks/use_risk_engine_status';
import { useInitRiskEngineMutation } from '../api/hooks/use_init_risk_engine_mutation';
import { useEnableRiskEngineMutation } from '../api/hooks/use_enable_risk_engine_mutation';
import { useDisableRiskEngineMutation } from '../api/hooks/use_disable_risk_engine_mutation';
import { RiskEngineStatus, MAX_SPACES_COUNT } from '../../../common/risk_engine';

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

      <EuiAccordion id={'risk-engine-erros'} buttonContent={i18n.ERROR_PANEL_ERRORS}>
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

export const RiskScoreEnableSection = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { data: riskEngineStatus } = useRiskEngineStatus();
  const initRiskEngineMutation = useInitRiskEngineMutation({
    onSettled: () => {
      setIsModalVisible(false);
    },
  });

  const enableRiskEngineMutation = useEnableRiskEngineMutation();
  const disableRiskEngineMutation = useDisableRiskEngineMutation();

  const currentRiskEngineStatus = riskEngineStatus?.risk_engine_status;

  const closeModal = () => setIsModalVisible(false);
  const showModal = () => setIsModalVisible(true);

  const isLoading =
    initRiskEngineMutation.isLoading ||
    enableRiskEngineMutation.isLoading ||
    disableRiskEngineMutation.isLoading;

  const isUpdateAvailable = riskEngineStatus?.isUpdateAvailable;
  const btnIsDisabled = !currentRiskEngineStatus || isLoading;

  const onSwitchClick = () => {
    if (btnIsDisabled) {
      return;
    }

    if (currentRiskEngineStatus === RiskEngineStatus.NOT_INSTALLED) {
      initRiskEngineMutation.mutate();
    } else if (currentRiskEngineStatus === RiskEngineStatus.ENABLED) {
      disableRiskEngineMutation.mutate();
    } else if (currentRiskEngineStatus === RiskEngineStatus.DISABLED) {
      enableRiskEngineMutation.mutate();
    }
  };

  let modal;

  if (isModalVisible) {
    modal = (
      <EuiModal onClose={closeModal}>
        {initRiskEngineMutation.isLoading ? (
          <EuiModalHeader>
            <EuiFlexGroup gutterSize="m" alignItems="center">
              <EuiLoadingSpinner size="m" />
              <EuiModalHeaderTitle>{i18n.UPDATING_RISK_ENGINE}</EuiModalHeaderTitle>
            </EuiFlexGroup>
          </EuiModalHeader>
        ) : (
          <>
            <EuiModalHeader>
              <EuiModalHeaderTitle>{i18n.UPDATE_RISK_ENGINE_MODAL_TITLE}</EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              <EuiText>
                <p>
                  <b>{i18n.UPDATE_RISK_ENGINE_MODAL_EXISTING_USER_HOST_1}</b>
                  {i18n.UPDATE_RISK_ENGINE_MODAL_EXISTING_USER_HOST_2}
                </p>
                <EuiSpacer size="s" />
                <p>
                  <b>{i18n.UPDATE_RISK_ENGINE_MODAL_EXISTING_DATA_1}</b>
                  {i18n.UPDATE_RISK_ENGINE_MODAL_EXISTING_DATA_2}
                </p>
              </EuiText>
              <EuiSpacer />
            </EuiModalBody>

            <EuiModalFooter>
              <EuiButtonEmpty
                color="primary"
                data-test-subj="risk-score-update-cancel"
                onClick={closeModal}
              >
                {i18n.UPDATE_RISK_ENGINE_MODAL_BUTTON_NO}
              </EuiButtonEmpty>
              <EuiButton
                color="primary"
                data-test-subj="risk-score-update-confirm"
                onClick={() => initRiskEngineMutation.mutate()}
                fill
              >
                {i18n.UPDATE_RISK_ENGINE_MODAL_BUTTON_YES}
              </EuiButton>
            </EuiModalFooter>
          </>
        )}
      </EuiModal>
    );
  }

  let initRiskEngineErrors: string[] = [];

  if (initRiskEngineMutation.isError) {
    const errorBody = initRiskEngineMutation.error.body.message;
    if (errorBody?.full_error?.errors) {
      initRiskEngineErrors = errorBody.full_error?.errors;
    } else {
      initRiskEngineErrors = [errorBody];
    }
  }

  if (
    currentRiskEngineStatus !== RiskEngineStatus.ENABLED &&
    riskEngineStatus?.is_max_amount_of_risk_engines_reached
  ) {
    return (
      <EuiCallOut
        title={i18n.getMaxSpaceTitle(MAX_SPACES_COUNT)}
        color="warning"
        iconType="error"
        data-test-subj="risk-score-warning-panel"
      >
        <p>{i18n.MAX_SPACE_PANEL_MESSAGE}</p>
      </EuiCallOut>
    );
  }
  return (
    <>
      <>
        <EuiTitle>
          <h2>{i18n.RISK_SCORE_MODULE_STATUS}</h2>
        </EuiTitle>
        {initRiskEngineMutation.isError && <RiskScoreErrorPanel errors={initRiskEngineErrors} />}
        {disableRiskEngineMutation.isError && (
          <RiskScoreErrorPanel errors={[disableRiskEngineMutation.error.body.message.message]} />
        )}
        {enableRiskEngineMutation.isError && (
          <RiskScoreErrorPanel errors={[enableRiskEngineMutation.error.body.message.message]} />
        )}

        <EuiSpacer size="m" />
        <EuiFlexItem grow={0}>
          {modal}
          <EuiHorizontalRule margin="s" />

          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems={'baseline'}>
                {i18n.ENTITY_RISK_SCORING}
                {isUpdateAvailable && <EuiBadge color="success">{i18n.UPDATE_AVAILABLE}</EuiBadge>}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {isUpdateAvailable && (
                <EuiFlexGroup gutterSize="s" alignItems={'center'}>
                  <EuiFlexItem>
                    {initRiskEngineMutation.isLoading && !isModalVisible && (
                      <EuiLoadingSpinner size="m" />
                    )}
                  </EuiFlexItem>
                  <EuiButtonEmpty
                    disabled={initRiskEngineMutation.isLoading}
                    color={'primary'}
                    onClick={showModal}
                    data-test-subj="risk-score-update-button"
                  >
                    {i18n.START_UPDATE}
                  </EuiButtonEmpty>
                </EuiFlexGroup>
              )}
              {!isUpdateAvailable && (
                <EuiFlexGroup gutterSize="s" alignItems={'center'}>
                  <EuiFlexItem>{isLoading && <EuiLoadingSpinner size="m" />}</EuiFlexItem>
                  <EuiFlexItem
                    css={{ minWidth: MIN_WIDTH_TO_PREVENT_LABEL_FROM_MOVING }}
                    data-test-subj="risk-score-status"
                  >
                    {currentRiskEngineStatus === RiskEngineStatus.ENABLED ? (
                      <EuiHealth color="success">{i18n.RISK_SCORE_MODULE_STATUS_ON}</EuiHealth>
                    ) : (
                      <EuiHealth color="subdued">{i18n.RISK_SCORE_MODULE_STATUS_OFF}</EuiHealth>
                    )}
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiSwitch
                      label={''}
                      data-test-subj="risk-score-switch"
                      checked={currentRiskEngineStatus === RiskEngineStatus.ENABLED}
                      onChange={onSwitchClick}
                      compressed
                      disabled={btnIsDisabled}
                      aria-describedby={'switchRiskModule'}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
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
