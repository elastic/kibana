/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';
import { Link, Redirect } from 'react-router-dom';

import { EuiButton } from '@elastic/eui';
import { ADD_SOURCE_PATH, getSourcesPath } from '../../routes';

import {
  ORG_SOURCES_LINK,
  ORG_SOURCES_HEADER_TITLE,
  ORG_SOURCES_HEADER_DESCRIPTION,
} from './constants';

import { Loading } from '../../../shared/loading';
import { ContentSection } from '../../components/shared/content_section';
import { SourcesTable } from '../../components/shared/sources_table';
import { ViewContentHeader } from '../../components/shared/view_content_header';

import { SourcesLogic } from './sources_logic';

import { SourcesView } from './sources_view';

export const OrganizationSources: React.FC = () => {
  const { initializeSources, setSourceSearchability, resetSourcesState } = useActions(SourcesLogic);

  useEffect(() => {
    initializeSources();
    return resetSourcesState;
  }, []);

  const { dataLoading, contentSources } = useValues(SourcesLogic);

  if (dataLoading) return <Loading />;

  if (contentSources.length === 0) return <Redirect to={getSourcesPath(ADD_SOURCE_PATH, true)} />;

  return (
    <SourcesView>
      <ViewContentHeader
        title={ORG_SOURCES_HEADER_TITLE}
        action={
          <Link to={getSourcesPath(ADD_SOURCE_PATH, true)}>
            <EuiButton fill color="primary" data-test-subj="AddSourceButton">
              {ORG_SOURCES_LINK}
            </EuiButton>
          </Link>
        }
        description={ORG_SOURCES_HEADER_DESCRIPTION}
        alignItems="flexStart"
      />

      <ContentSection>
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
