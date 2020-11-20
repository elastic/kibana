/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React, { useEffect, useState } from 'react';
import { INVALID_LICENSE } from '../../../../../../common/custom_link';
import { CustomLink } from '../../../../../../common/custom_link/custom_link_types';
import { useLicense } from '../../../../../hooks/useLicense';
import { useFetcher, FETCH_STATUS } from '../../../../../hooks/useFetcher';
import { LicensePrompt } from '../../../../shared/LicensePrompt';
import { CreateCustomLinkButton } from './CreateCustomLinkButton';
import { CreateEditCustomLinkFlyout } from './CreateEditCustomLinkFlyout';
import { CustomLinkTable } from './CustomLinkTable';
import { EmptyPrompt } from './EmptyPrompt';

export function CustomLinkOverview() {
  const license = useLicense();
  const hasValidLicense = license?.isActive && license?.hasAtLeast('gold');

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [customLinkSelected, setCustomLinkSelected] = useState<
    CustomLink | undefined
  >();

  const { data: customLinks, status, refetch } = useFetcher(
    async (callApmApi) => {
      if (hasValidLicense) {
        return callApmApi({ pathname: '/api/apm/settings/custom_links' });
      }
    },
    [hasValidLicense]
  );

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
      <EuiPanel>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiTitle>
                  <EuiFlexGroup
                    alignItems="center"
                    gutterSize="s"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <h2>
                        {i18n.translate(
                          'xpack.apm.settings.customizeUI.customLink',
                          {
                            defaultMessage: 'Custom Links',
                          }
                        )}
                      </h2>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
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
      </EuiPanel>
    </>
  );
}
