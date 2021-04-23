/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { Loading } from '../../../../shared/loading';
import { EuiPanelTo } from '../../../../shared/react_router_helpers';
import { AppLogic } from '../../../app_logic';
import aclImage from '../../../assets/supports_acl.svg';
import { ComponentLoader } from '../../../components/shared/component_loader';
import { CredentialItem } from '../../../components/shared/credential_item';
import { LicenseBadge } from '../../../components/shared/license_badge';
import { StatusItem } from '../../../components/shared/status_item';
import { ViewContentHeader } from '../../../components/shared/view_content_header';
import {
  RECENT_ACTIVITY_TITLE,
  CREDENTIALS_TITLE,
  DOCUMENTATION_LINK_TITLE,
} from '../../../constants';
import {
  CUSTOM_SOURCE_DOCS_URL,
  DOCUMENT_PERMISSIONS_DOCS_URL,
  ENT_SEARCH_LICENSE_MANAGEMENT,
  EXTERNAL_IDENTITIES_DOCS_URL,
  getGroupPath,
} from '../../../routes';
import {
  SOURCES_NO_CONTENT_TITLE,
  CONTENT_SUMMARY_TITLE,
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
  ACCESS_TOKEN_LABEL,
  ID_LABEL,
  LEARN_CUSTOM_FEATURES_BUTTON,
  DOC_PERMISSIONS_DESCRIPTION,
  CUSTOM_CALLOUT_TITLE,
} from '../constants';
import { SourceLogic } from '../source_logic';

export const Overview: React.FC = () => {
  const { contentSource, dataLoading } = useValues(SourceLogic);
  const { isOrganization } = useValues(AppLogic);

  const {
    id,
    summary,
    activities,
    groups,
    details,
    custom,
    accessToken,
    licenseSupportsPermissions,
    serviceTypeSupportsPermissions,
    indexPermissions,
    hasPermissions,
    isFederatedSource,
  } = contentSource;

  if (dataLoading) return <Loading />;

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
          <h4>{CONTENT_SUMMARY_TITLE}</h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        {!summary && <ComponentLoader text="Loading summary details..." />}
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
                <EuiText size="xs">{event}</EuiText>
              </EuiTableRowCell>
              {!custom && (
                <EuiTableRowCell>
                  <EuiText size="xs">
                    {status} {activityDetails && <StatusItem details={activityDetails} />}
                  </EuiText>
                </EuiTableRowCell>
              )}
              <EuiTableRowCell align="right">
                <EuiText size="xs">{time}</EuiText>
              </EuiTableRowCell>
            </EuiTableRow>
          ))}
        </EuiTableBody>
      </EuiTable>
    );

    return (
      <>
        <EuiTitle size="xs">
          <h3>{RECENT_ACTIVITY_TITLE}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {activities.length === 0 ? emptyState : activitiesTable}
      </>
    );
  };

  const groupsSummary = (
    <>
      <EuiText>
        <h4>{GROUP_ACCESS_TITLE}</h4>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="GroupsSummary">
        {groups.map((group, index) => (
          <EuiFlexItem key={index}>
            <EuiPanelTo
              hasShadow={false}
              color="subdued"
              to={getGroupPath(group.id)}
              data-test-subj="SourceGroupLink"
            >
              <EuiText size="s" className="eui-textTruncate">
                <strong>{group.name}</strong>
              </EuiText>
            </EuiPanelTo>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );

  const detailsSummary = (
    <>
      <EuiSpacer size="l" />
      <EuiText>
        <h4>{CONFIGURATION_TITLE}</h4>
      </EuiText>
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
      <EuiTitle size="s">
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
      <EuiTitle size="s">
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
              <EuiText size="m">
                <strong>{DOCUMENT_PERMISSIONS_DISABLED_TEXT}</strong>
              </EuiText>
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.enterpriseSearch.workplaceSearch.sources.learnMore.text"
                  defaultMessage="{learnMoreLink} about permissions"
                  values={{
                    learnMoreLink: (
                      <EuiLink target="_blank" href={DOCUMENT_PERMISSIONS_DOCS_URL}>
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
    <EuiPanel hasShadow={false} color="subdued">
      <EuiText size="s">
        <h6>
          <EuiTextColor color="subdued">{STATUS_HEADER}</EuiTextColor>
        </h6>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon size="l" type="checkInCircleFilled" color="secondary" />
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
                    <EuiLink target="_blank" href={EXTERNAL_IDENTITIES_DOCS_URL}>
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

  const credentials = (
    <EuiPanel hasShadow={false} color="subdued">
      <EuiText size="s">
        <h6>
          <EuiTextColor color="subdued">{CREDENTIALS_TITLE}</EuiTextColor>
        </h6>
      </EuiText>
      <EuiSpacer size="s" />
      <CredentialItem label={ID_LABEL} value={id} testSubj="ContentSourceId" />
      <EuiSpacer size="s" />
      <CredentialItem label={ACCESS_TOKEN_LABEL} value={accessToken} testSubj="AccessToken" />
    </EuiPanel>
  );

  const DocumentationCallout = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <EuiPanel hasShadow={false} color="subdued">
      <EuiText size="s">
        <h6>
          <EuiTextColor color="subdued">{DOCUMENTATION_LINK_TITLE}</EuiTextColor>
        </h6>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiTitle size="xs">
        <h4>{title}</h4>
      </EuiTitle>
      <EuiText size="s">{children}</EuiText>
    </EuiPanel>
  );

  const documentPermssionsLicenseLocked = (
    <EuiPanel hasShadow={false} color="subdued">
      <LicenseBadge />
      <EuiSpacer size="s" />
      <EuiTitle size="xs">
        <h4>{DOCUMENT_PERMISSIONS_TITLE}</h4>
      </EuiTitle>
      <EuiText size="s">
        <p>{DOC_PERMISSIONS_DESCRIPTION}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <EuiLink target="_blank" href={ENT_SEARCH_LICENSE_MANAGEMENT}>
          {LEARN_CUSTOM_FEATURES_BUTTON}
        </EuiLink>
      </EuiText>
    </EuiPanel>
  );

  return (
    <>
      <ViewContentHeader title="Source overview" />
      <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
        <EuiFlexItem>
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
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="m" direction="column">
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
                {indexPermissions && <EuiFlexItem>{credentials}</EuiFlexItem>}
              </>
            )}
            {custom && (
              <>
                <EuiFlexItem>{sourceStatus}</EuiFlexItem>
                <EuiFlexItem>{credentials}</EuiFlexItem>
                <EuiFlexItem>
                  <DocumentationCallout
                    data-test-subj="DocumentationCallout"
                    title={CUSTOM_CALLOUT_TITLE}
                  >
                    <p>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.workplaceSearch.sources.learnMoreCustom.text"
                        defaultMessage="{learnMoreLink} about custom sources."
                        values={{
                          learnMoreLink: (
                            <EuiLink target="_blank" href={CUSTOM_SOURCE_DOCS_URL}>
                              {LEARN_MORE_LINK}
                            </EuiLink>
                          ),
                        }}
                      />
                    </p>
                  </DocumentationCallout>
                </EuiFlexItem>
                {!licenseSupportsPermissions && (
                  <EuiFlexItem>{documentPermssionsLicenseLocked}</EuiFlexItem>
                )}
              </>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
