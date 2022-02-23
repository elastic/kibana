/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';
import { reject } from 'lodash';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';

import { EuiButtonEmptyTo } from '../../../../shared/react_router_helpers';
import { WorkplaceSearchPageTemplate } from '../../../components/layout';
import { LicenseCallout } from '../../../components/shared/license_callout';
import { SourceIcon } from '../../../components/shared/source_icon';
import {
  NAV,
  CONFIGURE_BUTTON,
  CONNECTORS_HEADER_TITLE,
  CONNECTORS_HEADER_DESCRIPTION,
  CUSTOM_SERVICE_TYPE,
  PRIVATE_PLATINUM_LICENSE_CALLOUT,
  PRIVATE_SOURCE,
  UPDATE_BUTTON,
} from '../../../constants';
import { getAddPath, getEditPath, getSourcesPath } from '../../../routes';
import { SettingsLogic } from '../settings_logic';

export const Connectors: React.FC = () => {
  const { initializeConnectors } = useActions(SettingsLogic);
  const { dataLoading, connectors } = useValues(SettingsLogic);

  useEffect(() => {
    initializeConnectors();
  }, []);

  const availableConnectors = reject(
    connectors,
    ({ serviceType }) => serviceType === CUSTOM_SERVICE_TYPE
  );

  const getRowActions = (configured: boolean, serviceType: string, supportedByLicense: boolean) => {
    const addPath = getAddPath(serviceType);
    const editPath = getEditPath(serviceType);

    const configurePath = getSourcesPath(addPath, true);

    const updateButtons = (
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmptyTo to={editPath as string} data-test-subj="UpdateButton">
            {UPDATE_BUTTON}
          </EuiButtonEmptyTo>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    const configureButton = supportedByLicense ? (
      <EuiButtonEmptyTo to={configurePath} data-test-subj="ConfigureButton">
        {CONFIGURE_BUTTON}
      </EuiButtonEmptyTo>
    ) : (
      <EuiButtonEmpty data-test-subj="ConfigureButton" disabled>
        {CONFIGURE_BUTTON}
      </EuiButtonEmpty>
    );

    return configured ? updateButtons : configureButton;
  };

  const platinumLicenseCallout = <LicenseCallout message={PRIVATE_PLATINUM_LICENSE_CALLOUT} />;

  const connectorsList = (
    <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
      {availableConnectors.map(
        ({ serviceType, name, configured, accountContextOnly, supportedByLicense }) => (
          <EuiFlexItem key={serviceType} data-test-subj="ConnectorRow">
            <EuiHorizontalRule margin="xs" />
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
              <EuiFlexItem grow={1}>
                <EuiFlexGroup justifyContent="flexStart" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <SourceIcon serviceType={serviceType} name={name} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="s" alignItems="center">
                      <EuiFlexItem grow={false}>{name}</EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        {accountContextOnly && <EuiBadge color="hollow">{PRIVATE_SOURCE}</EuiBadge>}
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {getRowActions(configured, serviceType, supportedByLicense)}
              </EuiFlexItem>
            </EuiFlexGroup>
            {accountContextOnly && !supportedByLicense && (
              <EuiFlexGroup justifyContent="flexStart" alignItems="center" responsive={false}>
                <EuiFlexItem>
                  <EuiSpacer size="s" />
                  {platinumLicenseCallout}
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiFlexItem>
        )
      )}
    </EuiFlexGroup>
  );

  return (
    <WorkplaceSearchPageTemplate
      pageChrome={[NAV.SETTINGS, NAV.SETTINGS_SOURCE_PRIORITIZATION]}
      pageHeader={{
        pageTitle: CONNECTORS_HEADER_TITLE,
        description: CONNECTORS_HEADER_DESCRIPTION,
      }}
      isLoading={dataLoading}
    >
      {connectorsList}
    </WorkplaceSearchPageTemplate>
  );
};
