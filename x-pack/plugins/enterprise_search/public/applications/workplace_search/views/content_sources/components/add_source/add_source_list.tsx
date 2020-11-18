/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import noSharedSourcesIcon from 'workplace_search/components/assets/shareCircle.svg';

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
import { ContentSection } from '../../../../components/shared/content_section';
import { Loading } from '../../../../../../applications/shared/loading';
import { CUSTOM_SERVICE_TYPE } from '../../../../constants';
import { SourceDataItem } from '../../../../types';
import { SOURCES_PATH, getSourcesPath } from '../../../../routes';

import { SourcesLogic } from '../../sources_logic';
import { AvailableSourcesList } from './available_sources_list';
import { ConfiguredSourcesList } from './configured_sources_list';

const NEW_SOURCE_DESCRIPTION =
  'When configuring and connecting a source, you are creating distinct entities with searchable content synchronized from the content platform itself. A source can be added using one of the available source connectors or via Custom API Sources, for additional flexibility.';
const ORG_SOURCE_DESCRIPTION =
  'Shared content sources are available to your entire organization or can be assigned to specific user groups.';
const PRIVATE_SOURCE_DESCRIPTION =
  'Connect a new source to add its content and documents to your search experience.';
const NO_SOURCES_TITLE = 'Configure and connect your first content source';
const ORG_SOURCES_TITLE = 'Add a shared content source';
const PRIVATE_SOURCES_TITLE = 'Add a new content source';
const PLACEHOLDER = 'Filter sources...';

export const AddSourceList: React.FC = () => {
  const { contentSources, dataLoading, availableSources, configuredSources } = useValues(
    SourcesLogic
  );

  const { initializeSources, resetSourcesState } = useActions(SourcesLogic);

  const { isOrganization } = useValues(AppLogic);

  const [filterValue, setFilterValue] = useState('');

  useEffect(() => {
    initializeSources();
    return resetSourcesState;
  }, []);

  if (dataLoading) return <Loading />;

  const hasSources = contentSources.length > 0;
  const showConfiguredSourcesList = configuredSources.find(
    ({ serviceType }) => serviceType !== CUSTOM_SERVICE_TYPE
  );

  const breadcrumbs = {
    topLevelPath: getSourcesPath(SOURCES_PATH, isOrganization),
    topLevelName: `${isOrganization ? 'Shared' : 'Private'} content sources`,
    activeName: 'Add',
  };

  const SIDEBAR_DESCRIPTION = hasSources ? '' : NEW_SOURCE_DESCRIPTION;
  const SIDEBAR_CONTEXT_DESCRIPTION = isOrganization
    ? ORG_SOURCE_DESCRIPTION
    : PRIVATE_SOURCE_DESCRIPTION;
  const HAS_SOURCES_TITLE = isOrganization ? ORG_SOURCES_TITLE : PRIVATE_SOURCES_TITLE;
  const SIDEBAR_TITLE = hasSources ? HAS_SOURCES_TITLE : NO_SOURCES_TITLE;

  const handleFilterChange = (e) => setFilterValue(e.target.value);

  const filterSources = (source, sources): boolean => {
    if (!filterValue) return true;
    const filterSource = sources.find(({ serviceType }) => serviceType === source.serviceType);
    const filteredName = filterSource?.name || '';
    return filteredName.toLowerCase().indexOf(filterValue.toLowerCase()) > -1;
  };

  const filterAvailableSources = (source) => filterSources(source, availableSources);
  const filterConfiguredSources = (source) => filterSources(source, configuredSources);

  const visibleAvailableSources = availableSources.filter(
    filterAvailableSources
  ) as SourceDataItem[];
  const visibleConfiguredSources = configuredSources.filter(
    filterConfiguredSources
  ) as SourceDataItem[];

  return showConfiguredSourcesList || isOrganization ? (
    <ContentSection>
      <EuiSpacer />
      <EuiFormRow>
        <EuiFieldSearch
          data-test-subj="FilterSourcesInput"
          value={filterValue}
          onChange={handleFilterChange}
          fullWidth={true}
          placeholder={PLACEHOLDER}
        />
      </EuiFormRow>
      <EuiSpacer size="xxl" />
      {showConfiguredSourcesList && (
        <ConfiguredSourcesList isOrganization={isOrganization} sources={visibleConfiguredSources} />
      )}
      {isOrganization && <AvailableSourcesList sources={visibleAvailableSources} />}
    </ContentSection>
  ) : (
    <ContentSection>
      <EuiFlexGroup justifyContent="center" alignItems="stretch">
        <EuiFlexItem>
          <EuiSpacer size="xl" />
          <EuiPanel className="euiPanel euiPanel--inset">
            <EuiSpacer size="s" />
            <EuiSpacer size="xxl" />
            <EuiEmptyPrompt
              iconType={noSharedSourcesIcon}
              title={<h2>No available sources</h2>}
              body={
                <p>
                  Sources will be available for search when an administrator adds them to this
                  organization.
                </p>
              }
            />
            <EuiSpacer size="xxl" />
            <EuiSpacer size="m" />
          </EuiPanel>
          <EuiSpacer size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ContentSection>
  );
};
