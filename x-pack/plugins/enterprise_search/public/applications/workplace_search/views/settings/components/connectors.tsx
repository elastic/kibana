/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { Loading } from '../../../../shared/loading';
import { SourceIcon } from '../../../components/shared/source_icon';
import { LicenseCallout } from '../../../components/shared/license_callout';
import { ViewContentHeader } from '../../../components/shared/view_content_header';

import {
  CONFIGURE_BUTTON,
  CONNECTORS_HEADER_TITLE,
  CONNECTORS_HEADER_DESCRIPTION,
  CUSTOM_SERVICE_TYPE,
  PRIVATE_PLATINUM_LICENSE_CALLOUT,
  PRIVATE_SOURCE,
  UPDATE_BUTTON,
} from '../../../constants';
import { getSourcesPath } from '../../../routes';
import { SourceDataItem } from '../../../types';

import { staticSourceData } from '../../content_sources/source_data';

import { SettingsLogic } from '../settings_logic';

export const Connectors: React.FC = () => {
  const { initializeConnectors } = useActions(SettingsLogic);
  const { dataLoading, connectors } = useValues(SettingsLogic);

  useEffect(() => {
    initializeConnectors();
  }, []);

  if (dataLoading) return <Loading />;

  const availableConnectors = reject(
    connectors,
    ({ serviceType }) => serviceType === CUSTOM_SERVICE_TYPE
  );

  const getRowActions = (configured: boolean, serviceType: string, supportedByLicense: boolean) => {
    const { addPath, editPath } = staticSourceData.find(
      (s) => s.serviceType === serviceType
    ) as SourceDataItem;
    const configurePath = getSourcesPath(addPath, true);

    const updateButtons = (
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmptyTo to={editPath} data-test-subj="UpdateButton">
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
                    <SourceIcon
                      serviceType={serviceType}
                      name={name}
                      className="source-row__icon"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <span className="source-row__name">
                      {name}
                      &nbsp;&nbsp;
                      {accountContextOnly && <EuiBadge color="hollow">{PRIVATE_SOURCE}</EuiBadge>}
                    </span>
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
    <>
      <ViewContentHeader
        title={CONNECTORS_HEADER_TITLE}
        description={CONNECTORS_HEADER_DESCRIPTION}
      />
      {connectorsList}
    </>
  );
};
