/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, ChangeEvent } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiFieldSearch,
  EuiFormRow,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiEmptyPrompt,
} from '@elastic/eui';

import { AppLogic } from '../../../../app_logic';
import noOrgSourcesIcon from '../../../../assets/share_circle.svg';
import {
  WorkplaceSearchPageTemplate,
  PersonalDashboardLayout,
} from '../../../../components/layout';
import { ContentSection } from '../../../../components/shared/content_section';
import { ViewContentHeader } from '../../../../components/shared/view_content_header';
import { NAV, CUSTOM_SERVICE_TYPE, EXTERNAL_SERVICE_TYPE } from '../../../../constants';
import { SourceDataItem } from '../../../../types';
import { SourcesLogic } from '../../sources_logic';

import { AvailableSourcesList } from './available_sources_list';
import { ConfiguredSourcesList } from './configured_sources_list';
import {
  ADD_SOURCE_NEW_SOURCE_DESCRIPTION,
  ADD_SOURCE_ORG_SOURCE_DESCRIPTION,
  ADD_SOURCE_PRIVATE_SOURCE_DESCRIPTION,
  ADD_SOURCE_NO_SOURCES_TITLE,
  ADD_SOURCE_ORG_SOURCES_TITLE,
  ADD_SOURCE_PRIVATE_SOURCES_TITLE,
  ADD_SOURCE_PLACEHOLDER,
  ADD_SOURCE_EMPTY_TITLE,
  ADD_SOURCE_EMPTY_BODY,
} from './constants';

export const AddSourceList: React.FC = () => {
  const { contentSources, dataLoading, availableSources, configuredSources } =
    useValues(SourcesLogic);

  const { initializeSources, resetSourcesState } = useActions(SourcesLogic);

  const { isOrganization } = useValues(AppLogic);

  const [filterValue, setFilterValue] = useState('');

  useEffect(() => {
    initializeSources();
    return resetSourcesState;
  }, []);

  const hasSources = contentSources.length > 0;
  const showConfiguredSourcesList = configuredSources.find(
    ({ serviceType }) => serviceType !== CUSTOM_SERVICE_TYPE
  );

  const BASE_DESCRIPTION = hasSources ? '' : ADD_SOURCE_NEW_SOURCE_DESCRIPTION;
  const PAGE_CONTEXT_DESCRIPTION = isOrganization
    ? ADD_SOURCE_ORG_SOURCE_DESCRIPTION
    : ADD_SOURCE_PRIVATE_SOURCE_DESCRIPTION;

  const PAGE_DESCRIPTION = BASE_DESCRIPTION + PAGE_CONTEXT_DESCRIPTION;
  const HAS_SOURCES_TITLE = isOrganization
    ? ADD_SOURCE_ORG_SOURCES_TITLE
    : ADD_SOURCE_PRIVATE_SOURCES_TITLE;
  const PAGE_TITLE = hasSources ? HAS_SOURCES_TITLE : ADD_SOURCE_NO_SOURCES_TITLE;

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>) => setFilterValue(e.target.value);

  const filterSources = (source: SourceDataItem, sources: SourceDataItem[]): boolean => {
    if (!filterValue) return true;
    const filterSource = sources.find(({ serviceType }) => serviceType === source.serviceType);
    const filteredName = filterSource?.name || '';
    return filteredName.toLowerCase().indexOf(filterValue.toLowerCase()) > -1;
  };

  const filterAvailableSources = (source: SourceDataItem) =>
    filterSources(source, availableSources);
  const filterConfiguredSources = (source: SourceDataItem) =>
    filterSources(source, configuredSources);

  const visibleAvailableSources = availableSources
    .filter(filterAvailableSources)
    .filter((source) => source.serviceType !== EXTERNAL_SERVICE_TYPE);
  // The API returns available external sources as a separate entry, but we don't want to present them as options to add

  const visibleConfiguredSources = configuredSources.filter(filterConfiguredSources);

  const Layout = isOrganization ? WorkplaceSearchPageTemplate : PersonalDashboardLayout;

  return (
    <Layout
      pageChrome={[NAV.SOURCES, NAV.ADD_SOURCE]}
      pageViewTelemetry="add_source"
      pageHeader={
        dataLoading ? undefined : { pageTitle: PAGE_TITLE, description: PAGE_DESCRIPTION }
      }
      isLoading={dataLoading}
    >
      {!isOrganization && (
        <div>
          <ViewContentHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        </div>
      )}
      {showConfiguredSourcesList || isOrganization ? (
        <ContentSection>
          <EuiFormRow>
            <EuiFieldSearch
              data-test-subj="FilterSourcesInput"
              value={filterValue}
              onChange={handleFilterChange}
              fullWidth
              placeholder={ADD_SOURCE_PLACEHOLDER}
            />
          </EuiFormRow>
          <EuiSpacer size="xxl" />
          {showConfiguredSourcesList && (
            <ConfiguredSourcesList
              isOrganization={isOrganization}
              sources={visibleConfiguredSources}
            />
          )}
          {isOrganization && <AvailableSourcesList sources={visibleAvailableSources} />}
        </ContentSection>
      ) : (
        <ContentSection>
          <EuiFlexGroup justifyContent="center" alignItems="stretch">
            <EuiFlexItem>
              <EuiSpacer size="xl" />
              <EuiPanel hasShadow={false} color="subdued">
                <EuiSpacer size="s" />
                <EuiSpacer size="xxl" />
                <EuiEmptyPrompt
                  iconType={noOrgSourcesIcon}
                  title={<h2>{ADD_SOURCE_EMPTY_TITLE}</h2>}
                  body={<p>{ADD_SOURCE_EMPTY_BODY}</p>}
                />
                <EuiSpacer size="xxl" />
                <EuiSpacer size="m" />
              </EuiPanel>
              <EuiSpacer size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </ContentSection>
      )}
    </Layout>
  );
};
