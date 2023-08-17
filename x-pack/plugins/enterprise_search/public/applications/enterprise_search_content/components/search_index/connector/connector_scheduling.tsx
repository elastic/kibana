/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { ConnectorStatus, SyncJobType } from '../../../../../../common/types/connectors';

import { generateEncodedPath } from '../../../../shared/encode_path_params';
import { KibanaLogic } from '../../../../shared/kibana';
import { LicensingLogic } from '../../../../shared/licensing';
import { EuiButtonTo, EuiLinkTo } from '../../../../shared/react_router_helpers';
import { UnsavedChangesPrompt } from '../../../../shared/unsaved_changes_prompt';
import { SEARCH_INDEX_TAB_PATH } from '../../../routes';
import { IngestionStatus } from '../../../types';
import * as indices from '../../../utils/indices';
import { IndexViewLogic } from '../index_view_logic';

import { SearchIndexTabId } from '../search_index';

import { ConnectorContentScheduling } from './connector_scheduling/full_content';
import { ConnectorSchedulingLogic } from './connector_scheduling_logic';

interface SchedulePanelProps {
  description: string;
  title: string;
}
export const SchedulePanel: React.FC<SchedulePanelProps> = ({ title, description, children }) => {
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

export const ConnectorSchedulingComponent: React.FC = () => {
  const { productFeatures } = useValues(KibanaLogic);
  const { ingestionStatus, hasDocumentLevelSecurityFeature, hasIncrementalSyncFeature } =
    useValues(IndexViewLogic);
  const { index } = useValues(IndexViewLogic);
  const { hasChanges } = useValues(ConnectorSchedulingLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const shouldShowIncrementalSync =
    hasIncrementalSyncFeature && productFeatures.hasIncrementalSyncEnabled;
  const shouldShowAccessControlSync =
    hasDocumentLevelSecurityFeature && productFeatures.hasDocumentLevelSecurityEnabled;
  if (!indices.isConnectorIndex(index)) {
    return <></>;
  }

  const isDocumentLevelSecurityDisabled =
    !index.connector.configuration.use_document_level_security?.value;

  if (
    index.connector.status === ConnectorStatus.CREATED ||
    index.connector.status === ConnectorStatus.NEEDS_CONFIGURATION
  ) {
    return (
      <>
        <EuiSpacer />
        <EuiCallOut
          iconType="iInCircle"
          title={i18n.translate(
            'xpack.enterpriseSearch.content.indices.connectorScheduling.notConnected.title',
            {
              defaultMessage: 'Configure your connector to schedule a sync',
            }
          )}
        >
          <EuiText size="s">
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.connectorScheduling.notConnected.description',
              {
                defaultMessage:
                  'Configure and deploy your connector, then return here to set your sync schedule. This schedule will dictate the interval that the connector will sync with your data source for updated documents.',
              }
            )}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiButtonTo
            data-telemetry-id="entSearchContent-connector-scheduling-configure"
            to={generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
              indexName: index.name,
              tabId: SearchIndexTabId.CONFIGURATION,
            })}
            fill
            size="s"
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.connectorScheduling.notConnected.button.label',
              {
                defaultMessage: 'Configure',
              }
            )}
          </EuiButtonTo>
        </EuiCallOut>
      </>
    );
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

      <EuiSpacer size="l" />
      {ingestionStatus === IngestionStatus.ERROR ? (
        <>
          <EuiCallOut
            color="warning"
            iconType="warning"
            title={i18n.translate(
              'xpack.enterpriseSearch.content.indices.connectorScheduling.error.title',
              { defaultMessage: 'Review your connector configuration for reported errors.' }
            )}
          />
          <EuiSpacer size="l" />
        </>
      ) : (
        <></>
      )}
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
      <EuiFlexGroup>
        <EuiFlexItem>
          <SchedulePanel
            title={i18n.translate(
              'xpack.enterpriseSearch.content.indices.connectorScheduling.schedulePanel.contentSync.title',
              { defaultMessage: 'Content sync' }
            )}
            description={i18n.translate(
              'xpack.enterpriseSearch.content.indices.connectorScheduling.schedulePanel.contentSync.description',
              { defaultMessage: 'Fetch content to create or update your Elasticsearch documents.' }
            )}
          >
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem>
                <ConnectorContentScheduling type={SyncJobType.FULL} index={index} />
              </EuiFlexItem>
              {shouldShowIncrementalSync && (
                <EuiFlexItem>
                  <ConnectorContentScheduling type={SyncJobType.INCREMENTAL} index={index} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </SchedulePanel>
        </EuiFlexItem>
        {shouldShowAccessControlSync && (
          <EuiFlexItem>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <SchedulePanel
                  title={i18n.translate(
                    'xpack.enterpriseSearch.content.indices.connectorScheduling.schedulePanel.documentLevelSecurity.title',
                    { defaultMessage: 'Document Level Security' }
                  )}
                  description={i18n.translate(
                    'xpack.enterpriseSearch.content.indices.connectorScheduling.schedulePanel.documentLevelSecurity.description',
                    {
                      defaultMessage:
                        'Control the documents users can access, based on their permissions and roles. Schedule syncs to keep these access controls up to date.',
                    }
                  )}
                >
                  <ConnectorContentScheduling
                    type={SyncJobType.ACCESS_CONTROL}
                    index={index}
                    hasPlatinumLicense={hasPlatinumLicense}
                  />
                </SchedulePanel>
              </EuiFlexItem>
              {isDocumentLevelSecurityDisabled && (
                <EuiFlexItem>
                  <EuiCallOut
                    title={i18n.translate(
                      'xpack.enterpriseSearch.content.indices.connectorScheduling.schedulePanel.documentLevelSecurity.dlsDisabledCallout.title',
                      { defaultMessage: 'Access control syncs not allowed' }
                    )}
                    color="warning"
                    iconType="iInCircle"
                  >
                    <p>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.content.indices.connectorScheduling.schedulePanel.documentLevelSecurity.dlsDisabledCallout.text"
                        defaultMessage="{link} for this connector to activate these options."
                        values={{
                          link: (
                            <EuiLinkTo
                              to={generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
                                indexName: index.name,
                                tabId: SearchIndexTabId.CONFIGURATION,
                              })}
                            >
                              {i18n.translate(
                                'xpack.enterpriseSearch.content.indices.connectorScheduling.schedulePanel.documentLevelSecurity.dlsDisabledCallout.link',
                                {
                                  defaultMessage: 'Enable document level security',
                                }
                              )}
                            </EuiLinkTo>
                          ),
                        }}
                      />
                    </p>
                  </EuiCallOut>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};

export interface Schedule {
  days: string;
  hours: string;
  minutes: string;
}
