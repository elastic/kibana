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

export function Welcome({
  isModalVisible = false,
  onClose,
  onConfirm,
}: {
  isModalVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const servicesInventory = useKibanaUrl('/plugins/apm/assets/services_inventory.png');

  if (!isModalVisible) {
    return null;
  }

  return (
    <EuiConfirmModal
      style={{
        width: '630px',
      }}
      onCancel={onClose}
      onConfirm={onConfirm}
      confirmButtonText={
        <EuiButton data-test-subj="xpack.apm.welcome.button.open" fill size="s">
          {i18n.translate('xpack.apm.welcome.button.openSurvey', {
            defaultMessage: 'OK',
          })}
        </EuiButton>
      }
      cancelButtonText={
        <EuiLink
          target="_blank"
          data-test-subj="apmWelcomeLinkExternal"
          href="https://ela.st/new-experience-services"
          external
        >
          {i18n.translate('xpack.apm.welcome.linkLabel', {
            defaultMessage: 'Learn more',
          })}
        </EuiLink>
      }
      defaultFocusedButton="confirm"
    >
      <EuiPanel hasShadow={false}>
        <EuiFlexGroup direction="column" justifyContent="center" alignItems="center" gutterSize="m">
          <EuiFlexItem>
            <EuiIcon type="logoElastic" size="l" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle>
              <h2>
                {i18n.translate('xpack.apm.welcome.title', {
                  defaultMessage: 'Welcome to our new experience!',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiPanel hasShadow={false} paddingSize="s">
        <EuiText grow={false} textAlign="center">
          <p>
            {i18n.translate('xpack.apm.welcome.body', {
              defaultMessage:
                'You can now see services detected from logs alongside your APM-instrumented services in a single inventory so you can view all of your services in one place.',
            })}
          </p>
        </EuiText>
      </EuiPanel>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder paddingSize="none">
        <EuiImage
          size="xl"
          src={servicesInventory}
          alt={i18n.translate('xpack.apm.welcome.image.alt', {
            defaultMessage:
              'Image of the new experience of the service inventory, showing services detected from logs and APM-instrumented services',
          })}
        />
      </EuiPanel>
    </EuiConfirmModal>
  );
}
