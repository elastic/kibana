/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Redirect } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { WorkplaceSearchPageTemplate } from '../../components/layout';
import { ContentSection } from '../../components/shared/content_section';
import { SourcesTable } from '../../components/shared/sources_table';
import { NAV } from '../../constants';
import { ADD_SOURCE_PATH, getSourcesPath } from '../../routes';

import {
  ORG_SOURCES_LINK,
  ORG_SOURCES_HEADER_TITLE,
  ORG_SOURCES_HEADER_DESCRIPTION,
} from './constants';
import { SourcesLogic } from './sources_logic';
import { SourcesView } from './sources_view';

export const OrganizationSources: React.FC = () => {
  const { initializeSources, setSourceSearchability, resetSourcesState } = useActions(SourcesLogic);

  useEffect(() => {
    initializeSources();
    return resetSourcesState;
  }, []);

  const { dataLoading, contentSources } = useValues(SourcesLogic);

  return (
    <WorkplaceSearchPageTemplate
      pageChrome={[NAV.SOURCES]}
      pageViewTelemetry="organization_sources"
      pageHeader={
        dataLoading
          ? undefined
          : {
              pageTitle: ORG_SOURCES_HEADER_TITLE,
              description: ORG_SOURCES_HEADER_DESCRIPTION,
              rightSideItems: [
                <EuiButtonTo
                  to={getSourcesPath(ADD_SOURCE_PATH, true)}
                  data-test-subj="AddSourceButton"
                  fill
                >
                  {ORG_SOURCES_LINK}
                </EuiButtonTo>,
              ],
            }
      }
      isLoading={dataLoading}
      isEmptyState={!contentSources.length}
      emptyState={<Redirect to={getSourcesPath(ADD_SOURCE_PATH, true)} />}
    >
      <SourcesView>
        <ContentSection>
          <SourcesTable
            showDetails
            isOrganization
            onSearchableToggle={setSourceSearchability}
            sources={contentSources}
          />
        </ContentSection>
      </SourcesView>
    </WorkplaceSearchPageTemplate>
  );
};
