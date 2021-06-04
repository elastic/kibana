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
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { Legacy } from '../legacy_shims';

export const EnableAlertsModal: React.FC<{}> = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const $injector = Legacy.shims.getAngularInjector();
  const alertsEnableModalProvider: any = $injector.get('enableAlertsModal');

  const closeModal = () => {
    setIsModalVisible(false);
    alertsEnableModalProvider.hideModalForSession();
  };

  useEffect(() => {
    if (alertsEnableModalProvider.shouldShowAlertsModal()) {
      setIsModalVisible(true);
    }
  }, [alertsEnableModalProvider]);

  const cancelButtonClick = () => {
    alertsEnableModalProvider.notAskAgain();
    closeModal();
  };

  const confirmButtonClick = () => {
    alertsEnableModalProvider.enableAlerts();
    closeModal();
  };

  return isModalVisible ? (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>Create alerts</h1>
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
          <p>
            <FormattedMessage
              id="xpack.monitoring.alerts.modal.createDescription"
              defaultMessage="Create these out-of-the box rules?"
            />
          </p>
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeModal}>
              <FormattedMessage
                id="xpack.monitoring.alerts.modal.remindLater"
                defaultMessage="Remind me later"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <div>
              <EuiButtonEmpty onClick={cancelButtonClick}>No</EuiButtonEmpty>

              <EuiButton onClick={confirmButtonClick} fill>
                Yes
              </EuiButton>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  ) : null;
};
