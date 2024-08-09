/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useKibanaUrl } from '../../../hooks/use_kibana_url';

export function Unauthorized({
  isUnauthorizedModalVisible = false,
  onClose,
  label,
}: {
  isUnauthorizedModalVisible?: boolean;
  onClose: () => void;
  label: string;
}) {
  const servicesInventory = useKibanaUrl('/plugins/apm/assets/services_inventory.png');

  return (
    <>
      {isUnauthorizedModalVisible && (
        <EuiConfirmModal
          style={{
            width: '630px',
          }}
          onCancel={onClose}
          onConfirm={onClose}
          confirmButtonText={
            <EuiButton data-test-subj="xpack.apm.unauthorised.button.open" fill size="s">
              {i18n.translate('xpack.apm.unauthorised.button.openSurvey', {
                defaultMessage: 'OK',
              })}
            </EuiButton>
          }
          cancelButtonText={
            <EuiLink
              target="_blank"
              data-test-subj="apmUnauthorizedLinkExternal"
              href="https://ela.st/new-experience-services"
              external
            >
              {i18n.translate('xpack.apm.unauthorized.linkLinkLabel', {
                defaultMessage: 'See how to enable EEM',
              })}
            </EuiLink>
          }
          defaultFocusedButton="confirm"
        >
          <EuiPanel hasShadow={false}>
            <EuiFlexGroup
              direction="column"
              justifyContent="center"
              alignItems="center"
              gutterSize="m"
            >
              <EuiFlexItem>
                <EuiIcon type="lock" size="l" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle>
                  <h2>
                    {i18n.translate('xpack.apm.unauthorised.title', {
                      defaultMessage: 'This feature is turned off',
                    })}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiPanel hasShadow={false} paddingSize="s">
            <EuiText grow={false} textAlign="center">
              <p>
                {i18n.translate('xpack.apm.unauthorised.body', {
                  defaultMessage:
                    'To see services detected from logs and APM-instrumented services in our new service inventory, please ask an administrator to visit this page and {label}. ',
                  values: { label: label.toLowerCase() },
                })}
              </p>
            </EuiText>
          </EuiPanel>
          <EuiSpacer size="m" />
          <EuiPanel hasBorder paddingSize="none">
            <EuiImage
              size="xl"
              src={servicesInventory}
              alt={i18n.translate('xpack.apm.unauthorised.image.at,', {
                defaultMessage:
                  'Image of the new experience of the service inventory, showing services detected from logs and APM-instrumented services',
              })}
            />
          </EuiPanel>
        </EuiConfirmModal>
      )}
    </>
  );
}
