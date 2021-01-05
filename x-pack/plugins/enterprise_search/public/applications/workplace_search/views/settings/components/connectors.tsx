/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';
import { reject } from 'lodash';
import { Link } from 'react-router-dom';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';

import { Loading } from '../../../../shared/loading';
import { SourceIcon } from '../../../components/shared/source_icon';
import { LicenseCallout } from '../../../components/shared/license_callout';
import { ViewContentHeader } from '../../../components/shared/view_content_header';

import { CUSTOM_SERVICE_TYPE } from '../../../constants';
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

  const getRowActions = (configured, serviceType, supportedByLicense) => {
    const { addPath, editPath } = staticSourceData.find(
      (s) => s.serviceType === serviceType
    ) as SourceDataItem;
    const configurePath = getSourcesPath(addPath, true);

    const updateButtons = (
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <Link to={editPath}>
            <EuiButtonEmpty data-test-subj="UpdateButton">Update</EuiButtonEmpty>
          </Link>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    const configureButton = supportedByLicense ? (
      <Link to={configurePath}>
        <EuiButtonEmpty data-test-subj="ConfigureButton">Configure</EuiButtonEmpty>
      </Link>
    ) : (
      <EuiButtonEmpty data-test-subj="ConfigureButton" disabled>
        Configure
      </EuiButtonEmpty>
    );

    return configured ? updateButtons : configureButton;
  };

  const platinumLicenseCallout = (
    <LicenseCallout message="Private Sources require a Platinum license." />
  );

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
                      {accountContextOnly && <EuiBadge color="hollow">Private Source</EuiBadge>}
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
        title="Content source connectors"
        description="All of your configurable connectors."
      />
      {connectorsList}
    </>
  );
};
