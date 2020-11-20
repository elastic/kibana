/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';
import { Link, Redirect } from 'react-router-dom';

import { EuiButton } from '@elastic/eui';
import { SidebarNavigation } from 'workplace_search/components';
import { ADD_SOURCE_PATH, getSourcesPath } from '../../routes';

import { Loading } from '../../../shared/loading';
import { ContentSection } from '../../components/shared/content_section';
import { SourcesTable } from '../../components/shared/sources_table';
import { ViewContentHeader } from '../../components/shared/view_content_header';

import { SourcesLogic } from './sources_logic';

import { SourcesView } from './sources_view';

const ORG_LINK_TITLE = 'Add an organization content source';
const ORG_NAV_TITLE = 'Manage organization content sources';
const ORG_NAV_DESCRIPTION =
  'Organization sources are available to the entire organization and can be shared to specific user groups. By default, newly created organization sources are added to the Default group.';
const ORG_HEADER_TITLE = 'Organization sources';
const ORG_HEADER_DESCRIPTION =
  'Organization sources are available to the entire organization and can be assigned to specific user groups.';

export const OrganizationSources: React.FC = () => {
  const { initializeSources, setSourceSearchability } = useActions(SourcesLogic);

  useEffect(() => {
    initializeSources();
  }, []);

  const { dataLoading, contentSources } = useValues(SourcesLogic);

  if (dataLoading) return <Loading />;

  if (contentSources.length === 0) return <Redirect to={getSourcesPath(ADD_SOURCE_PATH, true)} />;

  const linkTitle = ORG_LINK_TITLE;
  const navTitle = ORG_NAV_TITLE;
  const navDescription = ORG_NAV_DESCRIPTION;
  const headerTitle = ORG_HEADER_TITLE;
  const headerDescription = ORG_HEADER_DESCRIPTION;
  const sectionTitle = '';
  const sectionDescription = '';

  return (
    <SourcesView sidebar={<SidebarNavigation title={navTitle} description={navDescription} />}>
      <ViewContentHeader
        title={headerTitle}
        action={
          <Link to={getSourcesPath(ADD_SOURCE_PATH, true)}>
            <EuiButton fill color="primary" data-test-subj="AddSourceButton">
              {linkTitle}
            </EuiButton>
          </Link>
        }
        description={headerDescription}
        alignItems="flexStart"
      />

      <ContentSection title={sectionTitle} description={sectionDescription}>
        <SourcesTable
          showDetails
          isOrganization
          onSearchableToggle={setSourceSearchability}
          sources={contentSources}
        />
      </ContentSection>
    </SourcesView>
  );
};
