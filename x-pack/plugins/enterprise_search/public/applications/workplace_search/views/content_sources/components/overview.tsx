/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiButton,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiListGroup,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableRow,
  EuiTableRowCell,
  EuiText,
  EuiTextColor,
  EuiTitle,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { CANCEL_BUTTON_LABEL, START_BUTTON_LABEL } from '../../../../shared/constants';
import { docLinks } from '../../../../shared/doc_links';
import { EuiListGroupItemTo, EuiLinkTo } from '../../../../shared/react_router_helpers';
import { AppLogic } from '../../../app_logic';
import aclImage from '../../../assets/supports_acl.svg';
import { ComponentLoader } from '../../../components/shared/component_loader';
import { LicenseBadge } from '../../../components/shared/license_badge';
import { StatusItem } from '../../../components/shared/status_item';
import { ViewContentHeader } from '../../../components/shared/view_content_header';
import { RECENT_ACTIVITY_TITLE } from '../../../constants';
import {
  SYNC_FREQUENCY_PATH,
  BLOCKED_TIME_WINDOWS_PATH,
  getGroupPath,
  getContentSourcePath,
} from '../../../routes';
import {
  SOURCES_NO_CONTENT_TITLE,
  SOURCE_OVERVIEW_TITLE,
  CONTENT_SUMMARY_TITLE,
  CONTENT_SUMMARY_LOADING_TEXT,
  CONTENT_TYPE_HEADER,
  ITEMS_HEADER,
  EVENT_HEADER,
  STATUS_HEADER,
  TIME_HEADER,
  TOTAL_DOCUMENTS_LABEL,
  EMPTY_ACTIVITY_TITLE,
  GROUP_ACCESS_TITLE,
  CONFIGURATION_TITLE,
  DOCUMENT_PERMISSIONS_TITLE,
  DOCUMENT_PERMISSIONS_TEXT,
  DOCUMENT_PERMISSIONS_DISABLED_TEXT,
  LEARN_MORE_LINK,
  STATUS_HEADING,
  STATUS_TEXT,
  ADDITIONAL_CONFIG_HEADING,
  EXTERNAL_IDENTITIES_LINK,
  LEARN_CUSTOM_FEATURES_BUTTON,
  DOC_PERMISSIONS_DESCRIPTION,
  SOURCE_SYNCHRONIZATION_TITLE,
  SOURCE_SYNC_FREQUENCY_LINK_LABEL,
  SOURCE_BLOCKED_TIME_WINDOWS_LINK_LABEL,
  SOURCE_SYNCHRONIZATION_BUTTON_LABEL,
  SOURCE_SYNC_CONFIRM_TITLE,
  SOURCE_SYNC_CONFIRM_MESSAGE,
} from '../constants';
import { getSourceData } from '../source_data';
import { SourceLogic } from '../source_logic';

import { CustomSourceDeployment } from './custom_source_deployment';
import { SourceLayout } from './source_layout';

export const Overview: React.FC = () => {
  const { contentSource } = useValues(SourceLogic);
  const { initializeSourceSynchronization } = useActions(SourceLogic);
  const { isOrganization } = useValues(AppLogic);

  const {
    id,
    summary,
    activities,
    groups,
    details,
    custom,
    licenseSupportsPermissions,
    serviceTypeSupportsPermissions,
    indexPermissions,
    hasPermissions,
    isFederatedSource,
    isIndexedSource,
    name,
  } = contentSource;

  const serviceType = contentSource.baseServiceType || contentSource.serviceType;

  const sourceData = getSourceData(serviceType);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const closeModal = () => setIsModalVisible(false);
  const handleSyncClick = () => setIsModalVisible(true);
  const showSyncTriggerCallout = !custom && isIndexedSource && isOrganization;

  const onSyncConfirm = () => {
    initializeSourceSynchronization(id);
    setIsSyncing(true);
    closeModal();
  };

  const DocumentSummary = () => {
    let totalDocuments = 0;
    const tableContent = summary?.map((item, index) => {
      totalDocuments += item.count;
      return (
        item.count > 0 && (
          <EuiTableRow key={index} data-test-subj="DocumentSummaryRow">
            <EuiTableRowCell>{item.type}</EuiTableRowCell>
            <EuiTableRowCell>{item.count.toLocaleString('en-US')}</EuiTableRowCell>
          </EuiTableRow>
        )
      );
    });

    const emptyState = (
      <>
        <EuiSpacer size="s" />
        <EuiPanel
          hasShadow={false}
          color="subdued"
          paddingSize="l"
          data-test-subj="EmptyDocumentSummary"
        >
          <EuiEmptyPrompt
            title={<h2>{SOURCES_NO_CONTENT_TITLE}</h2>}
            iconType="documents"
            iconColor="subdued"
          />
        </EuiPanel>
      </>
    );

    return (
      <>
        <EuiTitle size="xs">
          <h3>{CONTENT_SUMMARY_TITLE}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {!summary && <ComponentLoader text={CONTENT_SUMMARY_LOADING_TEXT} />}
        {!!summary &&
          (totalDocuments === 0 ? (
            emptyState
          ) : (
            <EuiTable>
              <EuiTableHeader>
                <EuiTableHeaderCell>{CONTENT_TYPE_HEADER}</EuiTableHeaderCell>
                <EuiTableHeaderCell>{ITEMS_HEADER}</EuiTableHeaderCell>
              </EuiTableHeader>
              <EuiTableBody>
                {tableContent}
                <EuiTableRow>
                  <EuiTableRowCell>
                    <strong>{TOTAL_DOCUMENTS_LABEL}</strong>
                  </EuiTableRowCell>
                  <EuiTableRowCell>
                    <strong>{totalDocuments.toLocaleString('en-US')}</strong>
                  </EuiTableRowCell>
                </EuiTableRow>
              </EuiTableBody>
            </EuiTable>
          ))}
      </>
    );
  };

  const ActivitySummary = () => {
    const emptyState = (
      <>
        <EuiSpacer size="s" />
        <EuiPanel
          paddingSize="l"
          hasShadow={false}
          color="subdued"
          data-test-subj="EmptyActivitySummary"
        >
          <EuiEmptyPrompt
            title={<h2>{EMPTY_ACTIVITY_TITLE}</h2>}
            iconType="clock"
            iconColor="subdued"
          />
        </EuiPanel>
      </>
    );

    const activitiesTable = (
      <EuiTable>
        <EuiTableHeader>
          <EuiTableHeaderCell>{EVENT_HEADER}</EuiTableHeaderCell>
          {!custom && <EuiTableHeaderCell>{STATUS_HEADER}</EuiTableHeaderCell>}
          <EuiTableHeaderCell align="right">{TIME_HEADER}</EuiTableHeaderCell>
        </EuiTableHeader>
        <EuiTableBody>
          {activities.map(({ details: activityDetails, event, time, status }, i) => (
            <EuiTableRow key={i}>
              <EuiTableRowCell>
                <EuiText size="s">{event}</EuiText>
              </EuiTableRowCell>
              {!custom && (
                <EuiTableRowCell>
                  <EuiText size="s">
                    <small>
                      {status} {activityDetails && <StatusItem details={activityDetails} />}
                    </small>
                  </EuiText>
                </EuiTableRowCell>
              )}
              <EuiTableRowCell align="right">
                <EuiText size="s">
                  <small>{time}</small>
                </EuiText>
              </EuiTableRowCell>
            </EuiTableRow>
          ))}
        </EuiTableBody>
      </EuiTable>
    );

    return (
      <>
        <EuiTitle size="xs">
          <h4>{RECENT_ACTIVITY_TITLE}</h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        {activities.length === 0 ? emptyState : activitiesTable}
      </>
    );
  };

  const groupsSummary = (
    <>
      <EuiSpacer />
      <EuiTitle size="xs">
        <h5>{GROUP_ACCESS_TITLE}</h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel color="subdued">
        <EuiListGroup flush maxWidth={false} data-test-subj="GroupsSummary">
          {groups.map((group, index) => (
            <EuiListGroupItemTo
              label={group.name}
              key={index}
              to={getGroupPath(group.id)}
              data-test-subj="SourceGroupLink"
            />
          ))}
        </EuiListGroup>
      </EuiPanel>
    </>
  );

  const detailsSummary = (
    <>
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h3>{CONFIGURATION_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel hasShadow={false} color="subdued">
        <EuiText size="s">
          {details.map((detail, index) => (
            <EuiFlexGroup
              wrap
              gutterSize="s"
              alignItems="center"
              justifyContent="spaceBetween"
              key={index}
            >
              <EuiFlexItem grow={false}>
                <strong>{detail.title}</strong>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{detail.description}</EuiFlexItem>
            </EuiFlexGroup>
          ))}
        </EuiText>
      </EuiPanel>
    </>
  );

  const documentPermissions = (
    <>
      <EuiSpacer />
      <EuiTitle size="xs">
        <h4>{DOCUMENT_PERMISSIONS_TITLE}</h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiPanel hasShadow={false} color="subdued">
        <EuiFlexGroup gutterSize="m" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type={aclImage} size="l" color="primary" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <strong>{DOCUMENT_PERMISSIONS_TEXT}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );

  const documentPermissionsDisabled = (
    <>
      <EuiSpacer />
      <EuiTitle size="xs">
        <h4>{DOCUMENT_PERMISSIONS_TITLE}</h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiPanel hasShadow={false} color="subdued" data-test-subj="DocumentPermissionsDisabled">
        <EuiText size="s">
          <EuiFlexGroup wrap gutterSize="m" alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiIcon size="l" type="iInCircle" color="subdued" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{DOCUMENT_PERMISSIONS_DISABLED_TEXT}</strong>
              </EuiText>
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.enterpriseSearch.workplaceSearch.sources.learnMore.text"
                  defaultMessage="{learnMoreLink} about permissions"
                  values={{
                    learnMoreLink: (
                      <EuiLink target="_blank" href={docLinks.workplaceSearchDocumentPermissions}>
                        {LEARN_MORE_LINK}
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiText>
      </EuiPanel>
    </>
  );

  const sourceStatus = (
    <>
      <EuiTitle size="xs">
        <h6>{STATUS_HEADER}</h6>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel hasShadow={false} color="subdued">
        <EuiFlexGroup gutterSize="m" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon size="l" type="checkInCircleFilled" color="success" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <strong>{STATUS_HEADING}</strong>
            </EuiText>
            <EuiText size="s">
              <p>{STATUS_TEXT}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );

  const permissionsStatus = (
    <EuiPanel hasShadow={false} color="subdued" data-test-subj="PermissionsStatus">
      <EuiText size="s">
        <h6>
          <EuiTextColor color="subdued">{STATUS_HEADING}</EuiTextColor>
        </h6>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon size="xl" type="dot" color="warning" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <strong>{ADDITIONAL_CONFIG_HEADING}</strong>
          </EuiText>
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.workplaceSearch.sources.externalIdentities.text"
                defaultMessage="The {externalIdentitiesLink} must be used to configure user access mappings. Read the guide to learn more."
                values={{
                  externalIdentitiesLink: (
                    <EuiLink target="_blank" href={docLinks.workplaceSearchExternalIdentities}>
                      {EXTERNAL_IDENTITIES_LINK}
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  const customSourceDeployment = (
    <>
      <EuiTitle size="xs">
        <h6>
          {i18n.translate('xpack.enterpriseSearch.workplaceSearch.deployment.title', {
            defaultMessage: 'Deployment',
          })}
        </h6>
      </EuiTitle>
      <EuiSpacer size="s" />
      <CustomSourceDeployment source={contentSource} sourceData={sourceData} small />
    </>
  );

  const documentPermssionsLicenseLocked = (
    <>
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <span>{DOCUMENT_PERMISSIONS_TITLE}</span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LicenseBadge />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiPanel hasShadow={false} color="subdued">
        <EuiText size="s">
          <p>{DOC_PERMISSIONS_DESCRIPTION}</p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <EuiLink target="_blank" href={docLinks.licenseManagement}>
            {LEARN_CUSTOM_FEATURES_BUTTON}
          </EuiLink>
        </EuiText>
      </EuiPanel>
    </>
  );

  const syncTriggerCallout = (
    <EuiFlexItem>
      <EuiTitle size="xs">
        <h5>{SOURCE_SYNCHRONIZATION_TITLE}</h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel color="subdued">
        <EuiButton fill isLoading={isSyncing} onClick={handleSyncClick} data-test-subj="SyncButton">
          {SOURCE_SYNCHRONIZATION_BUTTON_LABEL}
        </EuiButton>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.enterpriseSearch.workplaceSearch.sources.synchronizationCallout"
            defaultMessage="Configure {syncFrequencyLink} or {blockTimeWindowsLink}."
            values={{
              syncFrequencyLink: (
                <EuiLinkTo to={getContentSourcePath(SYNC_FREQUENCY_PATH, id, isOrganization)}>
                  {SOURCE_SYNC_FREQUENCY_LINK_LABEL}
                </EuiLinkTo>
              ),
              blockTimeWindowsLink: (
                <EuiLinkTo to={getContentSourcePath(BLOCKED_TIME_WINDOWS_PATH, id, isOrganization)}>
                  {SOURCE_BLOCKED_TIME_WINDOWS_LINK_LABEL}
                </EuiLinkTo>
              ),
            }}
          />
        </EuiText>
      </EuiPanel>
    </EuiFlexItem>
  );

  const syncConfirmModal = (
    <EuiConfirmModal
      title={SOURCE_SYNC_CONFIRM_TITLE}
      onCancel={closeModal}
      onConfirm={onSyncConfirm}
      cancelButtonText={CANCEL_BUTTON_LABEL}
      confirmButtonText={START_BUTTON_LABEL}
      defaultFocusedButton="confirm"
    >
      <p>{SOURCE_SYNC_CONFIRM_MESSAGE}</p>
    </EuiConfirmModal>
  );

  return (
    <SourceLayout pageViewTelemetry="source_overview">
      <ViewContentHeader title={SOURCE_OVERVIEW_TITLE} />
      {isModalVisible && syncConfirmModal}

      <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
        <EuiFlexItem grow={8}>
          <EuiFlexGroup gutterSize="xl" direction="column">
            <EuiFlexItem>
              <DocumentSummary data-test-subj="DocumentSummary" />
            </EuiFlexItem>
            {!isFederatedSource && (
              <EuiFlexItem>
                <ActivitySummary data-test-subj="ActivitySummary" />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <EuiFlexGroup gutterSize="m" direction="column">
            {showSyncTriggerCallout && syncTriggerCallout}
            <EuiFlexItem>{groups.length > 0 && groupsSummary}</EuiFlexItem>
            {details.length > 0 && <EuiFlexItem>{detailsSummary}</EuiFlexItem>}
            {!custom && serviceTypeSupportsPermissions && (
              <>
                {indexPermissions && !hasPermissions && (
                  <EuiFlexItem>{permissionsStatus}</EuiFlexItem>
                )}
                {indexPermissions && <EuiFlexItem>{documentPermissions}</EuiFlexItem>}
                {!indexPermissions && isOrganization && (
                  <EuiFlexItem>{documentPermissionsDisabled}</EuiFlexItem>
                )}
              </>
            )}
            {custom && (
              <>
                <EuiFlexItem>{sourceStatus}</EuiFlexItem>
                <EuiFlexItem>{customSourceDeployment}</EuiFlexItem>
                {!licenseSupportsPermissions && (
                  <EuiFlexItem>{documentPermssionsLicenseLocked}</EuiFlexItem>
                )}
              </>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {serviceType === 'external' && (
        <>
          <EuiSpacer />
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiCallOut
                size="s"
                color="primary"
                iconType="email"
                title={
                  <EuiLink href="https://www.elastic.co/kibana/feedback" external>
                    {i18n.translate(
                      'xpack.enterpriseSearch.workplaceSearch.sources.feedbackCallOutText',
                      {
                        defaultMessage:
                          'Have feedback about deploying a {name} Connector Package? Let us know.',
                        values: { name },
                      }
                    )}
                  </EuiLink>
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </SourceLayout>
  );
};
