/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValues } from 'kea';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
// @ts-expect-error types are not available for this package yet;
import { SearchProvider, SearchBox, Sorting, Facet } from '@elastic/react-search-ui';
// @ts-expect-error types are not available for this package yet
import AppSearchAPIConnector from '@elastic/search-ui-app-search-connector';
import { i18n } from '@kbn/i18n';

import './search_experience.scss';

import { externalUrl } from '../../../../shared/enterprise_search_url';
import { useLocalStorage } from '../../../../shared/use_local_storage';
import { EngineLogic } from '../../engine';
import { EmptyState } from '../components';

import { buildSearchUIConfig } from './build_search_ui_config';
import { buildSortOptions } from './build_sort_options';
import { ASCENDING, DESCENDING } from './constants';
import { CustomizationCallout } from './customization_callout';
import { CustomizationModal } from './customization_modal';
import { SearchExperienceContent } from './search_experience_content';
import { Fields, SortOption } from './types';
import { SearchBoxView, SortingView, MultiCheckboxFacetsView } from './views';

const RECENTLY_UPLOADED = i18n.translate(
  'xpack.enterpriseSearch.appSearch.documents.search.sortBy.option.recentlyUploaded',
  {
    defaultMessage: 'Recently Uploaded',
  }
);
const DEFAULT_SORT_OPTIONS: SortOption[] = [
  {
    name: DESCENDING(RECENTLY_UPLOADED),
    value: 'id',
    direction: 'desc',
  },
  {
    name: ASCENDING(RECENTLY_UPLOADED),
    value: 'id',
    direction: 'asc',
  },
];

export const SearchExperience: React.FC = () => {
  const { engine } = useValues(EngineLogic);
  const endpointBase = externalUrl.enterpriseSearchUrl;

  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const openCustomizationModal = () => setShowCustomizationModal(true);
  const closeCustomizationModal = () => setShowCustomizationModal(false);

  const [fields, setFields] = useLocalStorage<Fields>(
    `documents-search-experience-customization--${engine.name}`,
    {
      filterFields: [],
      sortFields: [],
    }
  );

  const sortingOptions = buildSortOptions(fields, DEFAULT_SORT_OPTIONS);

  const connector = new AppSearchAPIConnector({
    cacheResponses: false,
    endpointBase,
    engineName: engine.name,
    searchKey: engine.apiKey,
  });

  const searchProviderConfig = buildSearchUIConfig(connector, engine.schema || {}, fields);

  return (
    <div className="documentsSearchExperience">
      <SearchProvider config={searchProviderConfig}>
        <SearchBox
          searchAsYouType
          inputProps={{
            placeholder: i18n.translate(
              'xpack.enterpriseSearch.appSearch.documents.search.placeholder',
              {
                defaultMessage: 'Filter documents...',
              }
            ),
            'aria-label': i18n.translate(
              'xpack.enterpriseSearch.appSearch.documents.search.ariaLabel',
              {
                defaultMessage: 'Filter documents',
              }
            ),
            'data-test-subj': 'DocumentsFilterInput',
          }}
          view={SearchBoxView}
        />
        <EuiSpacer size="xl" />
        <EuiFlexGroup direction="row">
          <EuiFlexItem className="documentsSearchExperience__sidebar">
            <Sorting
              className="documentsSearchExperience__sorting"
              sortOptions={sortingOptions}
              view={SortingView}
            />
            <EuiSpacer />
            {fields.filterFields.length > 0 ? (
              <>
                {fields.filterFields.map((fieldName) => (
                  <section key={fieldName}>
                    <Facet
                      field={fieldName}
                      label={fieldName}
                      view={MultiCheckboxFacetsView}
                      filterType="any"
                    />
                    <EuiSpacer size="l" />
                  </section>
                ))}
                <EuiButton
                  data-test-subj="customize"
                  color="primary"
                  iconType="gear"
                  onClick={openCustomizationModal}
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.appSearch.documents.search.customizationButton',
                    {
                      defaultMessage: 'Customize filters and sort',
                    }
                  )}
                </EuiButton>
              </>
            ) : (
              <CustomizationCallout onClick={openCustomizationModal} />
            )}
          </EuiFlexItem>
          <EuiFlexItem className="documentsSearchExperience__content">
            {engine.document_count && engine.document_count > 0 ? (
              <SearchExperienceContent />
            ) : (
              <EmptyState />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </SearchProvider>
      {showCustomizationModal && (
        <CustomizationModal
          filterFields={fields.filterFields}
          sortFields={fields.sortFields}
          onClose={closeCustomizationModal}
          onSave={({ filterFields, sortFields }) => {
            setFields({ filterFields, sortFields });
            closeCustomizationModal();
          }}
        />
      )}
    </div>
  );
};
