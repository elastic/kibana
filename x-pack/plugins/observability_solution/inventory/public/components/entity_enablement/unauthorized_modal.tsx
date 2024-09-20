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
import inventoryLight from '../../assets/entities_intentory_light.png';

export function Unauthorized({
  showModal = false,
  onClose,
}: {
  showModal?: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {showModal && (
        <EuiConfirmModal
          style={{
            width: '630px',
          }}
          onCancel={onClose}
          onConfirm={onClose}
          confirmButtonText={
            <EuiButton data-test-subj="xpack.inventory.unauthorised.button.open" fill size="s">
              {i18n.translate('xpack.inventory.unauthorised.button.openSurvey', {
                defaultMessage: 'OK',
              })}
            </EuiButton>
          }
          cancelButtonText={
            <EuiLink
              target="_blank"
              data-test-subj="inventoryUnauthorizedLinkExternal"
              href="https://ela.st/docs-entity-inventory"
              external
            >
              {i18n.translate('xpack.inventory.unauthorized.linkLinkLabel', {
                defaultMessage: 'Learn more',
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
                    {i18n.translate('xpack.inventory.unauthorised.title', {
                      defaultMessage: 'Insufficient permissions',
                    })}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiPanel hasShadow={false} paddingSize="s">
            <EuiText grow={false} textAlign="center">
              <p>
                {i18n.translate('xpack.inventory.unauthorised.body', {
                  defaultMessage:
                    "You don't have permissions to turn on the Elastic Entity Model. Please ask your administrator to enable this for you so you can see everything you have in one place.",
                })}
              </p>
            </EuiText>
          </EuiPanel>
          <EuiSpacer size="m" />
          <EuiPanel hasBorder paddingSize="none">
            <EuiImage
              allowFullScreen
              size="xl"
              src={inventoryLight} // FIXME need dark version of this image
              alt={i18n.translate('xpack.inventory.unauthorised.image.at,', {
                defaultMessage:
                  'Image of the new experience of the entities inventory, showing services, hosts and containers',
              })}
            />
          </EuiPanel>
        </EuiConfirmModal>
      )}
    </>
  );
}
