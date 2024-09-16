/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors, setErrorMessage } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { EngineLogic } from '../engine';

import { NO_SEARCH_KEY_ERROR } from './i18n';

import { ActiveField } from './types';

interface InitialFieldValues {
  validFields: string[];
  validSortFields: string[];
  validFacetFields: string[];
  urlField?: string;
  thumbnailField?: string;
  titleField?: string;
}
interface SearchUIActions {
  loadFieldData(): void;
  onFieldDataLoaded(initialFieldValues: InitialFieldValues): InitialFieldValues;
  onActiveFieldChange(activeField: ActiveField): { activeField: ActiveField };
  onFacetFieldsChange(facetFields: string[]): { facetFields: string[] };
  onSortFieldsChange(sortFields: string[]): { sortFields: string[] };
  onTitleFieldChange(titleField: string): { titleField: string };
  onUrlFieldChange(urlField: string): { urlField: string };
  onThumbnailFieldChange(thumbnailField: string): { thumbnailField: string };
}

interface SearchUIValues {
  dataLoading: boolean;
  validFields: string[];
  validSortFields: string[];
  validFacetFields: string[];
  titleField: string;
  urlField: string;
  thumbnailField: string;
  facetFields: string[];
  sortFields: string[];
  activeField: ActiveField;
}

export const SearchUILogic = kea<MakeLogicType<SearchUIValues, SearchUIActions>>({
  path: ['enterprise_search', 'app_search', 'search_ui_logic'],
  actions: () => ({
    loadFieldData: () => true,
    onFieldDataLoaded: (initialFieldValues) => initialFieldValues,
    onActiveFieldChange: (activeField) => ({ activeField }),
    onFacetFieldsChange: (facetFields) => ({ facetFields }),
    onSortFieldsChange: (sortFields) => ({ sortFields }),
    onTitleFieldChange: (titleField) => ({ titleField }),
    onUrlFieldChange: (urlField) => ({ urlField }),
    onThumbnailFieldChange: (thumbnailField) => ({ thumbnailField }),
  }),
  // @ts-expect-error upgrade typescript v5.1.6
  reducers: () => ({
    dataLoading: [
      true,
      {
        onFieldDataLoaded: () => false,
      },
    ],
    // @ts-expect-error upgrade typescript v5.1.6
    validFields: [[], { onFieldDataLoaded: (_, { validFields }) => validFields }],
    // @ts-expect-error upgrade typescript v5.1.6
    validSortFields: [[], { onFieldDataLoaded: (_, { validSortFields }) => validSortFields }],
    // @ts-expect-error upgrade typescript v5.1.6
    validFacetFields: [[], { onFieldDataLoaded: (_, { validFacetFields }) => validFacetFields }],
    titleField: [
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onTitleFieldChange: (_, { titleField }) => titleField,
        // @ts-expect-error upgrade typescript v5.1.6
        onFieldDataLoaded: (_, { titleField }) => titleField || '',
      },
    ],
    urlField: [
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onUrlFieldChange: (_, { urlField }) => urlField,
        // @ts-expect-error upgrade typescript v5.1.6
        onFieldDataLoaded: (_, { urlField }) => urlField || '',
      },
    ],
    thumbnailField: [
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onThumbnailFieldChange: (_, { thumbnailField }) => thumbnailField,
      },
    ],
    // @ts-expect-error upgrade typescript v5.1.6
    facetFields: [[], { onFacetFieldsChange: (_, { facetFields }) => facetFields }],
    // @ts-expect-error upgrade typescript v5.1.6
    sortFields: [[], { onSortFieldsChange: (_, { sortFields }) => sortFields }],
    // @ts-expect-error upgrade typescript v5.1.6
    activeField: [ActiveField.None, { onActiveFieldChange: (_, { activeField }) => activeField }],
  }),
  listeners: ({ actions }) => ({
    loadFieldData: async () => {
      const { http } = HttpLogic.values;
      const { searchKey, engineName } = EngineLogic.values;

      if (!searchKey) {
        setErrorMessage(NO_SEARCH_KEY_ERROR(engineName));
        return;
      }

      const url = `/internal/app_search/engines/${engineName}/search_ui/field_config`;

      try {
        const initialFieldValues = await http.get<
          InitialFieldValues & {
            defaultValues: Pick<InitialFieldValues, 'urlField' | 'titleField'>;
          }
        >(url);
        const {
          defaultValues: { urlField, titleField },
          validFields,
          validSortFields,
          validFacetFields,
        } = initialFieldValues;

        actions.onFieldDataLoaded({
          validFields,
          validSortFields,
          validFacetFields,
          urlField,
          titleField,
        });
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
