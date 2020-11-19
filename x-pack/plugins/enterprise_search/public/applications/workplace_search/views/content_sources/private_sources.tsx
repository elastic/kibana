/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import noSharedSourcesIcon from 'workplace_search/components/assets/shareCircle.svg';

import { useActions, useValues } from 'kea';
import { Link } from 'react-router-dom';

import { EuiButton, EuiCallOut, EuiEmptyPrompt, EuiSpacer, EuiPanel } from '@elastic/eui';
import { ADD_SOURCE_PATH } from 'workplace_search/utils/routePaths';

import {
  Loading,
  ViewContentHeader,
  SidebarNavigation,
  SourcesTable,
  ContentSection,
} from 'workplace_search/components';

import { SidebarLink } from 'workplace_search/types';

import { AppLogic } from 'workplace_search/App/AppLogic';
import { SourcesView } from 'workplace_search/ContentSources/SourcesView';
import { SourcesLogic } from './SourcesLogic';

const PRIVATE_LINK_TITLE = 'Add a private content source';
const PRIVATE_CAN_CREATE_NAV_TITLE = 'Manage private content sources';
const PRIVATE_VIEW_ONLY_NAV_TITLE = 'Review Group Sources';
const PRIVATE_VIEW_ONLY_NAV_DESCRIPTION =
  'Review the status of all sources shared with your Group.';
const PRIVATE_CAN_CREATE_NAV_DESCRIPTION =
  'Review the status of all connected private sources, and manage private sources for your account.';
const PRIVATE_HEADER_TITLE = 'My private content sources';
const PRIVATE_HEADER_DESCRIPTION = 'Private content sources are available only to you.';
const PRIVATE_SHARED_SOURCES_TITLE = 'Shared content sources';

export const PrivateSources: React.FC = () => {
  const { initializeSources, setSourceSearchability, resetSourcesState } = useActions(SourcesLogic);

  useEffect(() => {
    initializeSources();
    return resetSourcesState;
  }, []);

  const { dataLoading, contentSources, serviceTypes, privateContentSources } = useValues(
    SourcesLogic
  );

  const {
    fpAccount: { canCreatePersonalSources, groups, minimumPlatinumLicense },
  } = useValues(AppLogic);

  if (dataLoading) return <Loading />;

  const sidebarLinks = [] as SidebarLink[];
  const hasConfiguredConnectors = serviceTypes.some(({ configured }) => configured);
  const canAddSources = canCreatePersonalSources && hasConfiguredConnectors;
  if (canAddSources) {
    sidebarLinks.push({
      title: PRIVATE_LINK_TITLE,
      iconType: 'plusInCircle',
      path: ADD_SOURCE_PATH,
    });
  }

  const headerAction = (
    <Link to={ADD_SOURCE_PATH}>
      <EuiButton fill color="primary" data-test-subj="AddSourceButton">
        {PRIVATE_LINK_TITLE}
      </EuiButton>
    </Link>
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
        <EuiEmptyPrompt
          iconType="lock"
          title={<h2>You have no private sources</h2>}
          body={
            <p>
              Select from the content sources below to create a private source, available only to
              you
            </p>
          }
        />
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

  const sharedSources = (
    <ContentSection
      title={PRIVATE_SHARED_SOURCES_TITLE}
      description={`You have access to the following sources through the group${
        groups.length === 1 ? '' : 's'
      } ${new Intl.ListFormat().format(groups)}.`}
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

  const navTitle = canCreatePersonalSources
    ? PRIVATE_CAN_CREATE_NAV_TITLE
    : PRIVATE_VIEW_ONLY_NAV_TITLE;
  const navDescription = canCreatePersonalSources
    ? PRIVATE_CAN_CREATE_NAV_DESCRIPTION
    : PRIVATE_VIEW_ONLY_NAV_DESCRIPTION;
  return (
    <SourcesView
      sidebar={
        <SidebarNavigation title={navTitle} description={navDescription} links={sidebarLinks} />
      }
    >
      {hasPrivateSources && !minimumPlatinumLicense && licenseCallout}
      {canAddSources && sourcesHeader}
      {canCreatePersonalSources && privateSources}
      {contentSources.length > 0 ? sharedSources : sharedSourcesEmptyState}
    </SourcesView>
  );
};
