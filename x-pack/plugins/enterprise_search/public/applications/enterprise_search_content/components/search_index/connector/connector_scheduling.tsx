/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, FC, PropsWithChildren } from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexItem, EuiSpacer, EuiSplitPanel, EuiText, EuiTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { ConnectorStatus, SchedulingConfiguraton } from '@kbn/search-connectors';
import { ConnectorSchedulingComponent } from '@kbn/search-connectors/components/scheduling/connector_scheduling';

import { Status } from '../../../../../../common/types/api';
import { generateEncodedPath } from '../../../../shared/encode_path_params';
import { KibanaLogic } from '../../../../shared/kibana';
import { LicensingLogic } from '../../../../shared/licensing';
import { UnsavedChangesPrompt } from '../../../../shared/unsaved_changes_prompt';
import { UpdateConnectorSchedulingApiLogic } from '../../../api/connector/update_connector_scheduling_api_logic';
import { CONNECTOR_DETAIL_TAB_PATH } from '../../../routes';
import { ConnectorDetailTabId } from '../../connector_detail/connector_detail';
import { ConnectorViewLogic } from '../../connector_detail/connector_view_logic';

interface SchedulePanelProps {
  description: string;
  title: string;
}
export const SchedulePanel: FC<PropsWithChildren<SchedulePanelProps>> = ({
  title,
  description,
  children,
}) => {
  return (
    <>
      <EuiSplitPanel.Outer>
        <EuiSplitPanel.Inner color="subdued">
          <EuiTitle>
            <h2>{title}</h2>
          </EuiTitle>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <EuiFlexItem>
            <EuiText size="s">{description}</EuiText>
          </EuiFlexItem>
          <EuiSpacer size="m" />
          {children}
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </>
  );
};

export const ConnectorScheduling: React.FC = () => {
  const { productFeatures, navigateToUrl } = useValues(KibanaLogic);
  const { connector, hasDocumentLevelSecurityFeature, hasIncrementalSyncFeature } =
    useValues(ConnectorViewLogic);
  const { status } = useValues(UpdateConnectorSchedulingApiLogic);
  const { makeRequest } = useActions(UpdateConnectorSchedulingApiLogic);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const shouldShowIncrementalSync =
    hasIncrementalSyncFeature && productFeatures.hasIncrementalSyncEnabled;

  const shouldShowAccessControlSync =
    hasDocumentLevelSecurityFeature && productFeatures.hasDocumentLevelSecurityEnabled;

  if (!connector) {
    return <></>;
  }

  return (
    <>
      <UnsavedChangesPrompt
        hasUnsavedChanges={hasChanges}
        messageText={i18n.translate(
          'xpack.enterpriseSearch.content.indices.connectorScheduling.unsaved.title',
          { defaultMessage: 'You have not saved your changes, are you sure you want to leave?' }
        )}
      />

      <ConnectorSchedulingComponent
        children={
          <>
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.indices.connectorScheduling.page.description"
                  defaultMessage="Your connector is now deployed. Schedule recurring content and access control syncs here. If you want to run a quick test, launch a one-time sync using the {sync} button."
                  values={{
                    sync: (
                      <b>
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.indices.connectorScheduling.page.sync.label',
                          {
                            defaultMessage: 'Sync',
                          }
                        )}
                      </b>
                    ),
                  }}
                />
              </p>
            </EuiText>
            <EuiSpacer size="l" />
          </>
        }
        connector={connector}
        configurationPathOnClick={() =>
          navigateToUrl(
            generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
              connectorId: connector.id,
              tabId: ConnectorDetailTabId.CONFIGURATION,
            })
          )
        }
        dataTelemetryIdPrefix="entSearchContent"
        hasChanges={hasChanges}
        hasIngestionError={connector.status === ConnectorStatus.ERROR}
        hasPlatinumLicense={hasPlatinumLicense}
        setHasChanges={setHasChanges}
        shouldShowAccessControlSync={shouldShowAccessControlSync}
        shouldShowIncrementalSync={shouldShowIncrementalSync}
        updateConnectorStatus={status === Status.LOADING}
        updateScheduling={(scheduling: SchedulingConfiguraton) =>
          makeRequest({ connectorId: connector.id, scheduling })
        }
      />
    </>
  );
};

export interface Schedule {
  days: string;
  hours: string;
  minutes: string;
}
