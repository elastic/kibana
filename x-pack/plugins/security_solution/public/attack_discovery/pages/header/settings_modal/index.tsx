/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  EuiToolTip,
  EuiTourStep,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  ATTACK_DISCOVERY_STORAGE_KEY,
  DEFAULT_ASSISTANT_NAMESPACE,
  DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS,
  SHOW_SETTINGS_TOUR_LOCAL_STORAGE_KEY,
} from '@kbn/elastic-assistant';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { AlertsSettings } from './alerts_settings';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { Footer } from './footer';
import { getIsTourEnabled } from './is_tour_enabled';
import * as i18n from './translations';

interface Props {
  connectorId: string | undefined;
  isLoading: boolean;
  localStorageAttackDiscoveryMaxAlerts: string | undefined;
  setLocalStorageAttackDiscoveryMaxAlerts: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const SettingsModalComponent: React.FC<Props> = ({
  connectorId,
  isLoading,
  localStorageAttackDiscoveryMaxAlerts,
  setLocalStorageAttackDiscoveryMaxAlerts,
}) => {
  const spaceId = useSpaceId() ?? 'default';
  const modalTitleId = useGeneratedHtmlId();

  const [maxAlerts, setMaxAlerts] = useState(
    localStorageAttackDiscoveryMaxAlerts ?? `${DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS}`
  );

  const [isModalVisible, setIsModalVisible] = useState(false);
  const showModal = useCallback(() => {
    setMaxAlerts(localStorageAttackDiscoveryMaxAlerts ?? `${DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS}`);

    setIsModalVisible(true);
  }, [localStorageAttackDiscoveryMaxAlerts]);
  const closeModal = useCallback(() => setIsModalVisible(false), []);

  const onReset = useCallback(() => setMaxAlerts(`${DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS}`), []);

  const onSave = useCallback(() => {
    setLocalStorageAttackDiscoveryMaxAlerts(maxAlerts);
    closeModal();
  }, [closeModal, maxAlerts, setLocalStorageAttackDiscoveryMaxAlerts]);

  const [showSettingsTour, setShowSettingsTour] = useLocalStorage<boolean>(
    `${DEFAULT_ASSISTANT_NAMESPACE}.${ATTACK_DISCOVERY_STORAGE_KEY}.${spaceId}.${SHOW_SETTINGS_TOUR_LOCAL_STORAGE_KEY}.v8.16`,
    true
  );
  const onTourFinished = useCallback(() => setShowSettingsTour(() => false), [setShowSettingsTour]);
  const [tourDelayElapsed, setTourDelayElapsed] = useState(false);

  useEffect(() => {
    // visible EuiTourStep anchors don't follow the button when the layout changes (i.e. when the connectors finish loading)
    const timeout = setTimeout(() => setTourDelayElapsed(true), 10000);
    return () => clearTimeout(timeout);
  }, []);

  const onSettingsClicked = useCallback(() => {
    showModal();
    setShowSettingsTour(() => false);
  }, [setShowSettingsTour, showModal]);

  const SettingsButton = useMemo(
    () => (
      <EuiToolTip content={i18n.SETTINGS}>
        <EuiButtonIcon
          aria-label={i18n.SETTINGS}
          data-test-subj="settings"
          iconType="gear"
          onClick={onSettingsClicked}
        />
      </EuiToolTip>
    ),
    [onSettingsClicked]
  );

  const isTourEnabled = getIsTourEnabled({
    connectorId,
    isLoading,
    tourDelayElapsed,
    showSettingsTour,
  });

  return (
    <>
      {isTourEnabled ? (
        <EuiTourStep
          anchorPosition="downCenter"
          content={
            <>
              <EuiText size="s">
                <p>
                  <span>{i18n.ATTACK_DISCOVERY_SENDS_MORE_ALERTS}</span>
                  <br />
                  <span>{i18n.CONFIGURE_YOUR_SETTINGS_HERE}</span>
                </p>
              </EuiText>
            </>
          }
          isStepOpen={showSettingsTour}
          minWidth={300}
          onFinish={onTourFinished}
          step={1}
          stepsTotal={1}
          subtitle={i18n.RECENT_ATTACK_DISCOVERY_IMPROVEMENTS}
          title={i18n.SEND_MORE_ALERTS}
        >
          {SettingsButton}
        </EuiTourStep>
      ) : (
        <>{SettingsButton}</>
      )}

      {isModalVisible && (
        <EuiModal aria-labelledby={modalTitleId} data-test-subj="modal" onClose={closeModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle id={modalTitleId}>{i18n.SETTINGS}</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <AlertsSettings maxAlerts={maxAlerts} setMaxAlerts={setMaxAlerts} />
          </EuiModalBody>

          <EuiModalFooter>
            <Footer closeModal={closeModal} onReset={onReset} onSave={onSave} />
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};

SettingsModalComponent.displayName = 'SettingsModal';

export const SettingsModal = React.memo(SettingsModalComponent);
