/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { DEFAULT_META } from '../../../shared/constants';
import {
  flashAPIErrors,
  flashSuccessToast,
  setErrorMessage,
  clearFlashMessages,
} from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { AppLogic } from '../../app_logic';
import { PERSONAL_SOURCES_PATH, SOURCES_PATH, getSourcesPath } from '../../routes';
import { ContentSourceFullData, Meta, DocumentSummaryItem, SourceContentItem } from '../../types';

export interface SourceActions {
  onInitializeSource(contentSource: ContentSourceFullData): ContentSourceFullData;
  onUpdateSourceName(name: string): string;
  setSearchResults(searchResultsResponse: SearchResultsResponse): SearchResultsResponse;
  initializeFederatedSummary(sourceId: string): { sourceId: string };
  onUpdateSummary(summary: DocumentSummaryItem[]): DocumentSummaryItem[];
  setContentFilterValue(contentFilterValue: string): string;
  setActivePage(activePage: number): number;
  searchContentSourceDocuments(sourceId: string): { sourceId: string };
  updateContentSource(
    sourceId: string,
    source: SourceUpdatePayload
  ): {
    sourceId: string;
    source: ContentSourceFullData;
  };
  resetSourceState(): void;
  removeContentSource(sourceId: string): { sourceId: string };
  initializeSource(sourceId: string): { sourceId: string };
  setButtonNotLoading(): void;
}

interface SourceValues {
  contentSource: ContentSourceFullData;
  dataLoading: boolean;
  sectionLoading: boolean;
  buttonLoading: boolean;
  contentItems: SourceContentItem[];
  contentMeta: Meta;
  contentFilterValue: string;
}

interface SearchResultsResponse {
  results: SourceContentItem[];
  meta: Meta;
}

interface SourceUpdatePayload {
  name?: string;
  indexing?: {
    enabled?: boolean;
    features?: {
      thumbnails?: { enabled: boolean };
      content_extraction?: { enabled: boolean };
    };
  };
}

export const SourceLogic = kea<MakeLogicType<SourceValues, SourceActions>>({
  path: ['enterprise_search', 'workplace_search', 'source_logic'],
  actions: {
    onInitializeSource: (contentSource: ContentSourceFullData) => contentSource,
    onUpdateSourceName: (name: string) => name,
    onUpdateSummary: (summary: object[]) => summary,
    setSearchResults: (searchResultsResponse: SearchResultsResponse) => searchResultsResponse,
    setContentFilterValue: (contentFilterValue: string) => contentFilterValue,
    setActivePage: (activePage: number) => activePage,
    initializeSource: (sourceId: string) => ({ sourceId }),
    initializeFederatedSummary: (sourceId: string) => ({ sourceId }),
    searchContentSourceDocuments: (sourceId: string) => ({ sourceId }),
    updateContentSource: (sourceId: string, source: SourceUpdatePayload) => ({ sourceId, source }),
    removeContentSource: (sourceId: string) => ({
      sourceId,
    }),
    resetSourceState: () => true,
    setButtonNotLoading: () => false,
  },
  reducers: {
    contentSource: [
      {} as ContentSourceFullData,
      {
        onInitializeSource: (_, contentSource) => contentSource,
        onUpdateSourceName: (contentSource, name) => ({
          ...contentSource,
          name,
        }),
        onUpdateSummary: (contentSource, summary) => ({
          ...contentSource,
          summary,
        }),
        resetSourceState: () => ({} as ContentSourceFullData),
      },
    ],
    dataLoading: [
      true,
      {
        onInitializeSource: () => false,
        resetSourceState: () => true,
      },
    ],
    buttonLoading: [
      false,
      {
        setButtonNotLoading: () => false,
        resetSourceState: () => false,
        removeContentSource: () => true,
      },
    ],
    sectionLoading: [
      true,
      {
        searchContentSourceDocuments: () => true,
        setSearchResults: () => false,
      },
    ],
    contentItems: [
      [],
      {
        setSearchResults: (_, { results }) => results,
      },
    ],
    contentMeta: [
      DEFAULT_META,
      {
        setActivePage: (state, activePage) => setPage(state, activePage),
        setContentFilterValue: (state) => setPage(state, DEFAULT_META.page.current),
        setSearchResults: (_, { meta }) => meta,
      },
    ],
    contentFilterValue: [
      '',
      {
        setContentFilterValue: (_, contentFilterValue) => contentFilterValue,
        resetSourceState: () => '',
      },
    ],
  },
  listeners: ({ actions, values }) => ({
    initializeSource: async ({ sourceId }) => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? `/api/workplace_search/org/sources/${sourceId}`
        : `/api/workplace_search/account/sources/${sourceId}`;

      try {
        const response = await HttpLogic.values.http.get(route);
        actions.onInitializeSource(response);
        if (response.isFederatedSource) {
          actions.initializeFederatedSummary(sourceId);
        }
        if (response.errors) {
          setErrorMessage(response.errors);
        } else {
          clearFlashMessages();
        }
      } catch (e) {
        if (e?.response?.status === 404) {
          const redirect = isOrganization ? SOURCES_PATH : PERSONAL_SOURCES_PATH;
          KibanaLogic.values.navigateToUrl(redirect);
          setErrorMessage(
            i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.notFoundErrorMessage', {
              defaultMessage: 'Source not found.',
            })
          );
        } else {
          flashAPIErrors(e);
        }
      }
    },
    initializeFederatedSummary: async ({ sourceId }) => {
      const route = `/api/workplace_search/account/sources/${sourceId}/federated_summary`;
      try {
        const response = await HttpLogic.values.http.get(route);
        actions.onUpdateSummary(response.summary);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    searchContentSourceDocuments: async ({ sourceId }, breakpoint) => {
      await breakpoint(300);

      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? `/api/workplace_search/org/sources/${sourceId}/documents`
        : `/api/workplace_search/account/sources/${sourceId}/documents`;

      const {
        contentFilterValue: query,
        contentMeta: { page },
      } = values;

      try {
        const response = await HttpLogic.values.http.post(route, {
          body: JSON.stringify({ query, page }),
        });
        actions.setSearchResults(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    updateContentSource: async ({ sourceId, source }) => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? `/api/workplace_search/org/sources/${sourceId}/settings`
        : `/api/workplace_search/account/sources/${sourceId}/settings`;

      try {
        const response = await HttpLogic.values.http.patch(route, {
          body: JSON.stringify({ content_source: source }),
        });
        if (source.name) {
          actions.onUpdateSourceName(response.name);
        }
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    removeContentSource: async ({ sourceId }) => {
      clearFlashMessages();
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? `/api/workplace_search/org/sources/${sourceId}`
        : `/api/workplace_search/account/sources/${sourceId}`;

      try {
        const response = await HttpLogic.values.http.delete(route);
        KibanaLogic.values.navigateToUrl(getSourcesPath(SOURCES_PATH, isOrganization));
        flashSuccessToast(
          i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.sources.flashMessages.contentSourceRemoved',
            {
              defaultMessage: 'Successfully deleted {sourceName}.',
              values: { sourceName: response.name },
            }
          )
        );
      } catch (e) {
        flashAPIErrors(e);
      } finally {
        actions.setButtonNotLoading();
      }
    },
    onUpdateSourceName: (name: string) => {
      flashSuccessToast(
        i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.sources.flashMessages.contentSourceNameChanged',
          {
            defaultMessage: 'Successfully changed name to {sourceName}.',
            values: { sourceName: name },
          }
        )
      );
    },
    resetSourceState: () => {
      clearFlashMessages();
    },
  }),
});

const setPage = (state: Meta, page: number) => ({
  ...state,
  page: {
    ...state.page,
    current: page,
  },
});
