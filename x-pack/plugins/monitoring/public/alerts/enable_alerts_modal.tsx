/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiButtonEmpty,
  EuiText,
  EuiLink,
  EuiRadioGroup,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { Legacy } from '../legacy_shims';
import { useAlertsModal } from '../application/hooks/use_alerts_modal';

interface Props {
  alerts: {};
}

export const EnableAlertsModal: React.FC<Props> = ({ alerts }: Props) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const alertsEnableModalProvider = useAlertsModal();

  const closeModal = () => {
    setIsModalVisible(false);
    alertsEnableModalProvider.hideModalForSession();
  };

  const radios = [
    {
      id: 'create-alerts',
      label: i18n.translate('xpack.monitoring.alerts.modal.yesOption', {
        defaultMessage: 'Yes (Recommended - create default rules in this kibana space)',
      }),
    },
    {
      id: 'not-create-alerts',
      label: i18n.translate('xpack.monitoring.alerts.modal.noOption', {
        defaultMessage: 'No',
      }),
    },
  ];

  const [radioIdSelected, setRadioIdSelected] = useState('create-alerts');

  const onChange = (optionId: string) => {
    setRadioIdSelected(optionId);
  };

  useEffect(() => {
    if (alertsEnableModalProvider.shouldShowAlertsModal(alerts)) {
      setIsModalVisible(true);
    }
  }, [alertsEnableModalProvider, alerts]);

  const confirmButtonClick = () => {
    if (radioIdSelected === 'create-alerts') {
      alertsEnableModalProvider.enableAlerts();
    } else {
      alertsEnableModalProvider.notAskAgain();
    }

    closeModal();
  };

  const remindLaterClick = () => {
    alertsEnableModalProvider.hideModalForSession();
    closeModal();
  };

  return isModalVisible ? (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>
            <FormattedMessage
              id="xpack.monitoring.alerts.modal.title"
              defaultMessage="Create rules"
            />
          </h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.alerts.modal.description"
              defaultMessage="Stack monitoring comes with many out-of-the box rules to notify you of common issues
            around cluster health, resource utilization and errors or exceptions. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink
                    href={Legacy.shims.docLinks.links.monitoring.alertsKibana}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.monitoring.alerts.modal.description.link"
                      defaultMessage="Learn more..."
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
          <div>
            <FormattedMessage
              id="xpack.monitoring.alerts.modal.createDescription"
              defaultMessage="Create these out-of-the box rules?"
            />

            <EuiSpacer size="xs" />

            <EuiRadioGroup
              options={radios}
              idSelected={radioIdSelected}
              onChange={(id) => onChange(id)}
              name="radio group"
            />
          </div>
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={remindLaterClick}
          data-test-subj="alerts-modal-remind-later-button"
        >
          <FormattedMessage
            id="xpack.monitoring.alerts.modal.remindLater"
            defaultMessage="Remind me later"
          />
        </EuiButtonEmpty>

        <EuiButton onClick={confirmButtonClick} fill data-test-subj="alerts-modal-button">
          <FormattedMessage id="xpack.monitoring.alerts.modal.confirm" defaultMessage="Ok" />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  ) : null;
};
