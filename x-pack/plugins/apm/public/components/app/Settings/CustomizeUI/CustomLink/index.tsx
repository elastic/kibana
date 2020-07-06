/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEmpty } from 'lodash';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { CustomLink } from '../../../../../../common/custom_link/custom_link_types';
import { useLicense } from '../../../../../hooks/useLicense';
import { useFetcher, FETCH_STATUS } from '../../../../../hooks/useFetcher';
import { CustomLinkFlyout } from './CustomLinkFlyout';
import { CustomLinkTable } from './CustomLinkTable';
import { EmptyPrompt } from './EmptyPrompt';
import { Title } from './Title';
import { CreateCustomLinkButton } from './CreateCustomLinkButton';
import { LicensePrompt } from '../../../../shared/LicensePrompt';

export const CustomLinkOverview = () => {
  const license = useLicense();
  const hasValidLicense = license?.isActive && license?.hasAtLeast('gold');

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [customLinkSelected, setCustomLinkSelected] = useState<
    CustomLink | undefined
  >();

  const { data: customLinks, status, refetch } = useFetcher(
    (callApmApi) => callApmApi({ pathname: '/api/apm/settings/custom_links' }),
    []
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
        <CustomLinkFlyout
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
            <Title />
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
          <LicensePrompt
            text={i18n.translate(
              'xpack.apm.settings.customizeUI.customLink.license.text',
              {
                defaultMessage:
                  "To create custom links, you must be subscribed to an Elastic Gold license or above. With it, you'll have the ability to create custom links to improve your workflow when analyzing your services.",
              }
            )}
          />
        )}
      </EuiPanel>
    </>
  );
};
