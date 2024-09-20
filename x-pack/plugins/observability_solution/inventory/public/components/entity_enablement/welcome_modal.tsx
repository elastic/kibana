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
import inventoryLight from '../../assets/entities_intentory_light.png';

export function Welcome({
  showModal = false,
  onClose,
  onConfirm,
}: {
  showModal: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!showModal) {
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
        <EuiButton data-test-subj="xpack.inventory.welcome.button.open" fill size="s">
          {i18n.translate('xpack.inventory.welcome.button', {
            defaultMessage: 'OK',
          })}
        </EuiButton>
      }
      cancelButtonText={
        <EuiLink
          target="_blank"
          data-test-subj="inventoryWelcomeLinkExternal"
          href="https://ela.st/docs-entity-inventory"
          external
        >
          {i18n.translate('xpack.inventory.welcome.linkLabel', {
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
                {i18n.translate('xpack.inventory.welcome.title', {
                  defaultMessage: 'See everything you have in one place!',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiPanel hasShadow={false} paddingSize="s">
        <EuiText grow={false} textAlign="center">
          <p>
            {i18n.translate('xpack.inventory.welcome.body', {
              defaultMessage:
                'The inventory will show all of your observed entities in one place so you can detect and resolve problems with them faster.',
            })}
          </p>
        </EuiText>
      </EuiPanel>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder paddingSize="none">
        <EuiImage
          size="xl"
          src={inventoryLight}
          allowFullScreen
          alt={i18n.translate('xpack.inventory.welcome.image.alt', {
            defaultMessage:
              'Image of the new experience of the entities inventory, showing services, hosts and containers',
          })}
        />
      </EuiPanel>
    </EuiConfirmModal>
  );
}
