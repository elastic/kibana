/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiCallOut, EuiEmptyPrompt, EuiSpacer, EuiPanel } from '@elastic/eui';

import { LicensingLogic } from '../../../../applications/shared/licensing';

import { ADD_SOURCE_PATH, getSourcesPath } from '../../routes';

import noSharedSourcesIcon from '../../assets/share_circle.svg';

import { Loading } from '../../../shared/loading';
import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { ContentSection } from '../../components/shared/content_section';
import { SourcesTable } from '../../components/shared/sources_table';
import { ViewContentHeader } from '../../components/shared/view_content_header';

import { AppLogic } from '../../app_logic';
import { SourcesView } from './sources_view';
import { SourcesLogic } from './sources_logic';

// TODO: Remove this after links in Kibana sidenav
interface SidebarLink {
  title: string;
  path?: string;
  disabled?: boolean;
  iconType?: string;
  otherActivePath?: string;
  dataTestSubj?: string;
  onClick?(): void;
}

const PRIVATE_LINK_TITLE = 'Add a private content source';
const PRIVATE_CAN_CREATE_PAGE_TITLE = 'Manage private content sources';
const PRIVATE_VIEW_ONLY_PAGE_TITLE = 'Review Group Sources';
const PRIVATE_VIEW_ONLY_PAGE_DESCRIPTION =
  'Review the status of all sources shared with your Group.';
const PRIVATE_CAN_CREATE_PAGE_DESCRIPTION =
  'Review the status of all connected private sources, and manage private sources for your account.';
const PRIVATE_HEADER_TITLE = 'My private content sources';
const PRIVATE_HEADER_DESCRIPTION = 'Private content sources are available only to you.';
const PRIVATE_SHARED_SOURCES_TITLE = 'Shared content sources';

export const PrivateSources: React.FC = () => {
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { initializeSources, setSourceSearchability, resetSourcesState } = useActions(SourcesLogic);

  useEffect(() => {
    initializeSources();
    return resetSourcesState;
  }, []);

  const { dataLoading, contentSources, serviceTypes, privateContentSources } = useValues(
    SourcesLogic
  );

  const {
    account: { canCreatePersonalSources, groups },
  } = useValues(AppLogic);

  if (dataLoading) return <Loading />;

  const sidebarLinks = [] as SidebarLink[];
  const hasConfiguredConnectors = serviceTypes.some(({ configured }) => configured);
  const canAddSources = canCreatePersonalSources && hasConfiguredConnectors;
  if (canAddSources) {
    sidebarLinks.push({
      title: PRIVATE_LINK_TITLE,
      iconType: 'plusInCircle',
      path: getSourcesPath(ADD_SOURCE_PATH, false),
    });
  }

  const headerAction = (
    <EuiButtonTo
      to={getSourcesPath(ADD_SOURCE_PATH, false)}
      fill
      color="primary"
      data-test-subj="AddSourceButton"
    >
      {PRIVATE_LINK_TITLE}
    </EuiButtonTo>
  );

  const sourcesHeader = (
    <ViewContentHeader
      title={PRIVATE_HEADER_TITLE}
      action={headerAction}
      description={PRIVATE_HEADER_DESCRIPTION}
      alignItems="flexStart"
    />
  );

  const privateSourcesTable = (
    <ContentSection>
      <SourcesTable
        showDetails={true}
        onSearchableToggle={setSourceSearchability}
        sources={privateContentSources}
      />
    </ContentSection>
  );

  const privateSourcesEmptyState = (
    <ContentSection className="zero-state__private-sources">
      <EuiPanel className="euiPanel--inset">
        <EuiSpacer size="xxl" />
        <EuiEmptyPrompt iconType="lock" title={<h2>You have no private sources</h2>} />
        <EuiSpacer size="xxl" />
      </EuiPanel>
    </ContentSection>
  );

  const sharedSourcesEmptyState = (
    <ContentSection className="zero-state__private-sources">
      <EuiPanel className="euiPanel--inset">
        <EuiSpacer size="xxl" />
        <EuiEmptyPrompt
          iconType={noSharedSourcesIcon}
          title={<h2>No content source available</h2>}
          body={
            <p>
              Once content sources are shared with you, they will be displayed here, and available
              via the search experience.
            </p>
          }
        />
        <EuiSpacer size="xxl" />
      </EuiPanel>
    </ContentSection>
  );

  const hasPrivateSources = privateContentSources?.length > 0;
  const privateSources = hasPrivateSources ? privateSourcesTable : privateSourcesEmptyState;

  const groupsSentence = `${groups.slice(0, groups.length - 1).join(', ')}, and ${groups.slice(
    -1
  )}`;

  const sharedSources = (
    <ContentSection
      title={PRIVATE_SHARED_SOURCES_TITLE}
      description={`You have access to the following sources through the group${
        groups.length === 1 ? '' : 's'
      } ${groupsSentence}.`}
    >
      <SourcesTable showDetails={false} isOrganization={false} sources={contentSources} />
    </ContentSection>
  );

  const licenseCallout = (
    <>
      <EuiCallOut title="Private Sources are no longer available" iconType="iInCircle">
        <p>Contact your search experience administrator for more information.</p>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );

  const PAGE_TITLE = canCreatePersonalSources
    ? PRIVATE_CAN_CREATE_PAGE_TITLE
    : PRIVATE_VIEW_ONLY_PAGE_TITLE;
  const PAGE_DESCRIPTION = canCreatePersonalSources
    ? PRIVATE_CAN_CREATE_PAGE_DESCRIPTION
    : PRIVATE_VIEW_ONLY_PAGE_DESCRIPTION;

  const pageHeader = <ViewContentHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />;

  return (
    <SourcesView>
      {/* TODO: Figure out with design how to make this look better w/o 2 ViewContentHeaders */}
      {pageHeader}
      {hasPrivateSources && !hasPlatinumLicense && licenseCallout}
      {canAddSources && sourcesHeader}
      {canCreatePersonalSources && privateSources}
      {contentSources.length > 0 ? sharedSources : sharedSourcesEmptyState}
    </SourcesView>
  );
};
