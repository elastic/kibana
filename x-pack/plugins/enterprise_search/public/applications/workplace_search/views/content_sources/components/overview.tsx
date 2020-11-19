/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useValues } from 'kea';
import { Link } from 'react-router-dom';

import {
  EuiAvatar,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
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

import FlashMessages from 'shared/components/FlashMessages';
import {
  CUSTOM_SOURCE_DOCS_URL,
  DOCUMENT_PERMISSIONS_DOCS_URL,
  ENT_SEARCH_LICENSE_MANAGEMENT,
  EXTERNAL_IDENTITIES_DOCS_URL,
  SOURCE_CONTENT_PATH,
  getContentSourcePath,
  getGroupPath,
} from '../../../routes';

import { AppLogic } from '../../../app_logic';

import { ComponentLoader } from '../../../components/shared/component_loader';
import { CredentialItem } from '../../../components/shared/credential_item';
import { ViewContentHeader } from '../../../components/shared/view_content_header';
import { LicenseBadge } from '../../../components/shared/license_badge';
import { Loading } from '../../../../../applications/shared/loading';

import aclImage from '../../../components/assets/supports_acl.svg';
import { SourceLogic } from '../source_logic';

export const Overview: React.FC = () => {
  const { contentSource, flashMessages, dataLoading } = useValues(SourceLogic);
  const { isOrganization } = useValues(AppLogic);

  const {
    id,
    summary,
    documentCount,
    activities,
    groups,
    details,
    custom,
    accessToken,
    key,
    licenseSupportsPermissions,
    serviceTypeSupportsPermissions,
    indexPermissions,
    hasPermissions,
    isFederatedSource,
  } = contentSource;

  if (dataLoading) return <Loading />;

  const DocumentSummary = () => {
    let totalDocuments = 0;
    const tableContent =
      summary &&
      summary.map((item, index) => {
        totalDocuments += item.count;
        return (
          item.count > 0 && (
            <EuiTableRow key={index}>
              <EuiTableRowCell>{item.type}</EuiTableRowCell>
              <EuiTableRowCell>{item.count.toLocaleString('en-US')}</EuiTableRowCell>
            </EuiTableRow>
          )
        );
      });

    const emptyState = (
      <>
        <EuiSpacer size="s" />
        <EuiPanel paddingSize="l" className="euiPanel--inset">
          <EuiEmptyPrompt
            title={<h2>No content yet</h2>}
            iconType="documents"
            iconColor="subdued"
          />
        </EuiPanel>
      </>
    );

    return (
      <div className="content-section">
        <div className="section-header">
          <EuiFlexGroup gutterSize="none" alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h4>Content summary</h4>
              </EuiTitle>
            </EuiFlexItem>
            {totalDocuments > 0 && (
              <EuiFlexItem grow={false}>
                <Link to={getContentSourcePath(SOURCE_CONTENT_PATH, id, isOrganization)}>
                  <EuiButtonEmpty data-test-subj="ManageSourceContentLink" size="s">
                    Manage
                  </EuiButtonEmpty>
                </Link>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </div>
        <EuiSpacer size="s" />
        {!summary && <ComponentLoader text="Loading summary details..." />}
        {!!summary &&
          (totalDocuments === 0 ? (
            emptyState
          ) : (
            <EuiTable>
              <EuiTableHeader>
                <EuiTableHeaderCell>Content Type</EuiTableHeaderCell>
                <EuiTableHeaderCell>Items</EuiTableHeaderCell>
              </EuiTableHeader>
              <EuiTableBody>
                {tableContent}
                <EuiTableRow>
                  <EuiTableRowCell>
                    {summary ? <strong>Total documents</strong> : 'Documents'}
                  </EuiTableRowCell>
                  <EuiTableRowCell>
                    {summary ? (
                      <strong>{totalDocuments.toLocaleString('en-US')}</strong>
                    ) : (
                      parseInt(documentCount, 10).toLocaleString('en-US')
                    )}
                  </EuiTableRowCell>
                </EuiTableRow>
              </EuiTableBody>
            </EuiTable>
          ))}
      </div>
    );
  };

  const ActivitySummary = () => {
    const emptyState = (
      <>
        <EuiSpacer size="s" />
        <EuiPanel paddingSize="l" className="euiPanel--inset">
          <EuiEmptyPrompt
            title={<h2>There is no recent activity</h2>}
            iconType="clock"
            iconColor="subdued"
          />
        </EuiPanel>
      </>
    );

    const activitiesTable = (
      <EuiTable>
        <EuiTableHeader>
          <EuiTableHeaderCell>Event</EuiTableHeaderCell>
          {!custom && <EuiTableHeaderCell>Status</EuiTableHeaderCell>}
          <EuiTableHeaderCell>Time</EuiTableHeaderCell>
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
                    {status}{' '}
                    {activityDetails && (
                      <EuiIconTip
                        position="top"
                        content={activityDetails.map((detail, idx) => (
                          <div key={idx}>{detail}</div>
                        ))}
                      />
                    )}
                  </EuiText>
                </EuiTableRowCell>
              )}
              <EuiTableRowCell>
                <EuiText size="xs">{time}</EuiText>
              </EuiTableRowCell>
            </EuiTableRow>
          ))}
        </EuiTableBody>
      </EuiTable>
    );

    return (
      <div className="content-section">
        <div className="section-header">
          <EuiTitle size="xs">
            <h3>Recent activity</h3>
          </EuiTitle>
        </div>
        <EuiSpacer size="s" />
        {activities.length === 0 ? emptyState : activitiesTable}
      </div>
    );
  };

  const GroupsSummary = () => {
    const GroupAvatars = ({ users }) => {
      const MAX_USERS = 4;
      return (
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          {users.slice(0, MAX_USERS).map((user) => (
            <EuiFlexItem key={user.id}>
              <EuiAvatar
                size="s"
                initials={user.initials}
                name={user.name || user.initials}
                imageUrl={user.pictureUrl}
              />
            </EuiFlexItem>
          ))}
          {users.slice(MAX_USERS).length > 0 && (
            <EuiFlexItem>
              <EuiText color="subdued" size="xs">
                <strong>+{users.slice(MAX_USERS).length}</strong>
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    };

    return !groups.length ? null : (
      <EuiPanel>
        <EuiText size="s">
          <h6>
            <EuiTextColor color="subdued">Group Access</EuiTextColor>
          </h6>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column" gutterSize="s">
          {groups.map((group, index) => (
            <EuiFlexItem key={index}>
              <Link to={getGroupPath(group.id)} data-test-subj="SourceGroupLink">
                <EuiPanel className="euiPanel--inset">
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem>
                      <EuiText size="s" className="eui-textTruncate">
                        <strong>{group.name}</strong>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <GroupAvatars users={group.users} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </Link>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiPanel>
    );
  };

  const detailsSummary = (
    <EuiPanel>
      <EuiText size="s">
        <h6>
          <EuiTextColor color="subdued">Configuration</EuiTextColor>
        </h6>
      </EuiText>
      <EuiSpacer />
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
  );

  const documentPermissions = (
    <>
      <EuiSpacer />
      <EuiTitle size="s">
        <h4>Document-level permissions</h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiPanel>
        <EuiFlexGroup gutterSize="m" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type={aclImage} size="l" color="primary" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <strong>Using document-level permissions</strong>
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
        <h4>Document-level permissions</h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiPanel className="euiPanel--inset">
        <EuiText size="s">
          <EuiFlexGroup wrap gutterSize="m" alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiIcon size="l" type="iInCircle" color="subdued" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="m">
                <strong>Disabled for this source</strong>
              </EuiText>
              <EuiText size="s">
                <EuiLink target="_blank" href={DOCUMENT_PERMISSIONS_DOCS_URL}>
                  Learn more
                </EuiLink>{' '}
                about permissions
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiText>
      </EuiPanel>
    </>
  );

  const sourceStatus = (
    <EuiPanel>
      <EuiText size="s">
        <h6>
          <EuiTextColor color="subdued">Status</EuiTextColor>
        </h6>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon size="l" type="checkInCircleFilled" color="secondary" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <strong>Everything looks good</strong>
          </EuiText>
          <EuiText size="s">
            <p>Your endpoints are ready to accept requests.</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  const permissionsStatus = (
    <EuiPanel>
      <EuiText size="s">
        <h6>
          <EuiTextColor color="subdued">Status</EuiTextColor>
        </h6>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon size="xl" type="dot" color="warning" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <strong>Requires additional configuration</strong>
          </EuiText>
          <EuiText size="s">
            <p>
              The{' '}
              <EuiLink target="_blank" href={EXTERNAL_IDENTITIES_DOCS_URL}>
                External Identities API
              </EuiLink>{' '}
              must be used to configure user access mappings. Read the guide to learn more.
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  const credentials = (
    <EuiPanel>
      <EuiText size="s">
        <h6>
          <EuiTextColor color="subdued">Credentials</EuiTextColor>
        </h6>
      </EuiText>
      <EuiSpacer size="s" />
      <CredentialItem label="Access Token" value={accessToken} testSubj="AccessToken" />
      <EuiSpacer size="s" />
      <CredentialItem label="Key" value={key} testSubj="ContentSourceKey" />
    </EuiPanel>
  );

  const DocumentationCallout = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <EuiPanel>
      <EuiText size="s">
        <h6>
          <EuiTextColor color="subdued">Documentation</EuiTextColor>
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
    <EuiPanel>
      <LicenseBadge />
      <EuiSpacer size="s" />
      <EuiTitle size="xs">
        <h4>Document-level permissions</h4>
      </EuiTitle>
      <EuiText size="s">
        <p>
          Document-level permissions manage content access content on individual or group
          attributes. Allow or deny access to specific documents.
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <EuiLink target="_blank" href={ENT_SEARCH_LICENSE_MANAGEMENT}>
          Learn about Platinum features
        </EuiLink>
      </EuiText>
    </EuiPanel>
  );

  return (
    <>
      <ViewContentHeader title="Source overview" />
      <EuiSpacer size="m" />
      {!!flashMessages && <FlashMessages {...flashMessages} />}
      <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xl" direction="column">
            <EuiFlexItem>
              <DocumentSummary />
            </EuiFlexItem>
            {!isFederatedSource && (
              <EuiFlexItem>
                <ActivitySummary />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="m" direction="column">
            <EuiFlexItem>
              <GroupsSummary />
            </EuiFlexItem>
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
                  <DocumentationCallout title="Getting started with custom sources?">
                    <p>
                      <EuiLink target="_blank" href={CUSTOM_SOURCE_DOCS_URL}>
                        Learn more
                      </EuiLink>{' '}
                      about custom sources.
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
        <EuiEmptyPrompt />
      </EuiFlexGroup>
    </>
  );
};
