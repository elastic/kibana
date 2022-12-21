/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React, { useEffect, useState } from 'react';
import { INVALID_LICENSE } from '../../../../../common/custom_link';
import { CustomLink } from '../../../../../common/custom_link/custom_link_types';
import { useLicenseContext } from '../../../../context/license/use_license_context';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { LicensePrompt } from '../../../shared/license_prompt';
import { CreateCustomLinkButton } from './create_custom_link_button';
import { CreateEditCustomLinkFlyout } from './create_edit_custom_link_flyout';
import { CustomLinkTable } from './custom_link_table';
import { EmptyPrompt } from './empty_prompt';

export function CustomLinkOverview() {
  const license = useLicenseContext();
  const hasValidLicense = license?.isActive && license?.hasAtLeast('gold');

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [customLinkSelected, setCustomLinkSelected] = useState<
    CustomLink | undefined
  >();

  const { data, status, refetch } = useFetcher(
    async (callApmApi) => {
      if (hasValidLicense) {
        return callApmApi('GET /internal/apm/settings/custom_links');
      }
    },
    [hasValidLicense]
  );

  const customLinks = data?.customLinks ?? [];

  useEffect(() => {
    if (customLinkSelected) {
      setIsFlyoutOpen(true);
    }
  }, [customLinkSelected]);

  const onCloseFlyout = () => {
    setCustomLinkSelected(undefined);
    setIsFlyoutOpen(false);
  };

  const onCreateCustomLinkClick = () => {
    setIsFlyoutOpen(true);
  };

  const showEmptyPrompt =
    status === FETCH_STATUS.SUCCESS && isEmpty(customLinks);

  return (
    <>
      {isFlyoutOpen && (
        <CreateEditCustomLinkFlyout
          onClose={onCloseFlyout}
          defaults={customLinkSelected}
          customLinkId={customLinkSelected?.id}
          onSave={() => {
            onCloseFlyout();
            refetch();
          }}
          onDelete={() => {
            onCloseFlyout();
            refetch();
          }}
        />
      )}

      <EuiText color="subdued">
        {i18n.translate('xpack.apm.settings.customLink.info', {
          defaultMessage:
            'These links will be shown in the Actions context menu in selected areas of the app, e.g. by the transactions detail.',
        })}
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.apm.settings.customLink', {
                defaultMessage: 'Custom Links',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        {hasValidLicense && !showEmptyPrompt && (
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <CreateCustomLinkButton onClick={onCreateCustomLinkClick} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {hasValidLicense ? (
        showEmptyPrompt ? (
          <EmptyPrompt onCreateCustomLinkClick={onCreateCustomLinkClick} />
        ) : (
          <CustomLinkTable
            items={customLinks}
            onCustomLinkSelected={setCustomLinkSelected}
          />
        )
      ) : (
        <LicensePrompt text={INVALID_LICENSE} />
      )}
    </>
  );
}
