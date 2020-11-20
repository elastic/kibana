/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, findIndex } from 'lodash';

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { HttpLogic } from '../../../shared/http';

import {
  flashAPIErrors,
  setSuccessMessage,
  FlashMessagesLogic,
} from '../../../shared/flash_messages';

import { Connector, ContentSourceDetails, ContentSourceStatus, SourceDataItem } from '../../types';

import { staticSourceData } from './source_data';

import { AppLogic } from '../../app_logic';

const ORG_SOURCES_PATH = '/api/workplace_search/org/sources';
const ACCOUNT_SOURCES_PATH = '/api/workplace_search/account/sources';

interface ServerStatuses {
  [key: string]: string;
}

export interface ISourcesActions {
  setServerSourceStatuses(statuses: ContentSourceStatus[]): ContentSourceStatus[];
  onInitializeSources(serverResponse: ISourcesServerResponse): ISourcesServerResponse;
  onSetSearchability(
    sourceId: string,
    searchable: boolean
  ): { sourceId: string; searchable: boolean };
  setAddedSource(
    addedSourceName: string,
    additionalConfiguration: boolean,
    serviceType: string
  ): { addedSourceName: string; additionalConfiguration: boolean; serviceType: string };
  resetFlashMessages(): void;
  resetPermissionsModal(): void;
  resetSourcesState(): void;
  initializeSources(): void;
  pollForSourceStatusChanges(): void;
  setSourceSearchability(
    sourceId: string,
    searchable: boolean
  ): { sourceId: string; searchable: boolean };
}

export interface IPermissionsModalProps {
  addedSourceName: string;
  serviceType: string;
  additionalConfiguration: boolean;
}

type CombinedDataItem = SourceDataItem & ContentSourceDetails;

export interface ISourcesValues {
  contentSources: ContentSourceDetails[];
  privateContentSources: ContentSourceDetails[];
  sourceData: CombinedDataItem[];
  availableSources: SourceDataItem[];
  configuredSources: SourceDataItem[];
  serviceTypes: Connector[];
  permissionsModal: IPermissionsModalProps | null;
  dataLoading: boolean;
  serverStatuses: ServerStatuses | null;
}

interface ISourcesServerResponse {
  contentSources: ContentSourceDetails[];
  privateContentSources?: ContentSourceDetails[];
  serviceTypes: Connector[];
}

export const SourcesLogic = kea<MakeLogicType<ISourcesValues, ISourcesActions>>({
  actions: {
    setServerSourceStatuses: (statuses: ContentSourceStatus[]) => statuses,
    onInitializeSources: (serverResponse: ISourcesServerResponse) => serverResponse,
    onSetSearchability: (sourceId: string, searchable: boolean) => ({ sourceId, searchable }),
    setAddedSource: (
      addedSourceName: string,
      additionalConfiguration: boolean,
      serviceType: string
    ) => ({ addedSourceName, additionalConfiguration, serviceType }),
    resetFlashMessages: () => true,
    resetPermissionsModal: () => true,
    resetSourcesState: () => true,
    initializeSources: () => true,
    pollForSourceStatusChanges: () => true,
    setSourceSearchability: (sourceId: string, searchable: boolean) => ({ sourceId, searchable }),
  },
  reducers: {
    contentSources: [
      [],
      {
        onInitializeSources: (_, { contentSources }) => contentSources,
        onSetSearchability: (contentSources, { sourceId, searchable }) =>
          updateSourcesOnToggle(contentSources, sourceId, searchable),
      },
    ],
    privateContentSources: [
      [],
      {
        onInitializeSources: (_, { privateContentSources }) => privateContentSources || [],
        onSetSearchability: (privateContentSources, { sourceId, searchable }) =>
          updateSourcesOnToggle(privateContentSources, sourceId, searchable),
      },
    ],
    serviceTypes: [
      [],
      {
        onInitializeSources: (_, { serviceTypes }) => serviceTypes || [],
      },
    ],
    permissionsModal: [
      null,
      {
        setAddedSource: (_, data) => data,
        resetPermissionsModal: () => null,
      },
    ],
    dataLoading: [
      true,
      {
        onInitializeSources: () => false,
        resetSourcesState: () => true,
      },
    ],
    serverStatuses: [
      null,
      {
        setServerSourceStatuses: (_, sources) => {
          const serverStatuses = {} as ServerStatuses;
          sources.forEach((source) => {
            serverStatuses[source.id as string] = source.status.status;
          });
          return serverStatuses;
        },
      },
    ],
  },
  selectors: ({ selectors }) => ({
    availableSources: [
      () => [selectors.sourceData],
      (sourceData: SourceDataItem[]) => sourceData.filter(({ configured }) => !configured),
    ],
    configuredSources: [
      () => [selectors.sourceData],
      (sourceData: SourceDataItem[]) => sourceData.filter(({ configured }) => configured),
    ],
    sourceData: [
      () => [selectors.serviceTypes, selectors.contentSources],
      (serviceTypes, contentSources) =>
        mergeServerAndStaticData(serviceTypes, staticSourceData, contentSources),
    ],
  }),
  listeners: ({ actions, values }) => ({
    initializeSources: async () => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization ? ORG_SOURCES_PATH : ACCOUNT_SOURCES_PATH;

      try {
        const response = await HttpLogic.values.http.get(route);
        actions.onInitializeSources(response);
      } catch (e) {
        flashAPIErrors(e);
      }

      if (isOrganization && !values.serverStatuses) {
        // We want to get the initial statuses from the server to compare our polling results to.
        const sourceStatuses = await fetchSourceStatuses(isOrganization);
        actions.setServerSourceStatuses(sourceStatuses);
      }
    },
    // We poll the server and if the status update, we trigger a new fetch of the sources.
    pollForSourceStatusChanges: async () => {
      const { isOrganization } = AppLogic.values;
      if (!isOrganization) return;
      const serverStatuses = values.serverStatuses;

      const sourceStatuses = await fetchSourceStatuses(isOrganization);

      sourceStatuses.some((source: ContentSourceStatus) => {
        if (serverStatuses && serverStatuses[source.id] !== source.status.status) {
          return actions.initializeSources();
        }
      });
    },
    setSourceSearchability: async ({ sourceId, searchable }) => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? `/api/workplace_search/org/sources/${sourceId}/searchable`
        : `/api/workplace_search/account/sources/${sourceId}/searchable`;

      try {
        await HttpLogic.values.http.put(route, {
          body: JSON.stringify({ searchable }),
        });
        actions.onSetSearchability(sourceId, searchable);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    setAddedSource: ({ addedSourceName, additionalConfiguration }) => {
      const successfullyConnectedMessage = i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.sources.flashMessages.contentSourceConnected',
        {
          defaultMessage: 'Successfully connected {sourceName}.',
          values: { sourceName: addedSourceName },
        }
      );

      const additionalConfigurationMessage = i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.sources.flashMessages.additionalConfigurationNeeded',
        {
          defaultMessage: 'This source requires additional configuration.',
        }
      );

      setSuccessMessage(
        [
          successfullyConnectedMessage,
          additionalConfiguration ? additionalConfigurationMessage : '',
        ].join(' ')
      );
    },
    resetFlashMessages: () => {
      FlashMessagesLogic.actions.clearFlashMessages();
    },
  }),
});

const fetchSourceStatuses = async (isOrganization: boolean) => {
  const route = isOrganization ? ORG_SOURCES_PATH : ACCOUNT_SOURCES_PATH;
  let response;

  try {
    response = await HttpLogic.values.http.get(route);
    SourcesLogic.actions.setServerSourceStatuses(response);
  } catch (e) {
    flashAPIErrors(e);
  }

  return response;
};

const updateSourcesOnToggle = (
  contentSources: ContentSourceDetails[],
  sourceId: string,
  searchable: boolean
): ContentSourceDetails[] => {
  if (!contentSources) return [];
  const sources = cloneDeep(contentSources) as ContentSourceDetails[];
  const index = findIndex(sources, ({ id }) => id === sourceId);
  const updatedSource = sources[index];
  sources[index] = {
    ...updatedSource,
    searchable,
  };
  return sources;
};

/**
 * We have 3 different data sets we have to combine in the UI. The first is the static (`staticSourceData`)
 * data that contains the UI componets, such as the Path for React Router and the copy and images.
 *
 * The second is the base list of available sources that the server sends back in the collection,
 * `availableTypes` that is the source of truth for the name and whether the source has been configured.
 *
 * Fnally, also in the collection response is the current set of connected sources. We check for the
 * existence of a `connectedSource` of the type in the loop and set `connected` to true so that the UI
 * can diplay "Add New" instead of "Connect", the latter of which is displated only when a connector
 * has been configured but there are no connected sources yet.
 */
const mergeServerAndStaticData = (
  serverData: ContentSourceDetails[],
  staticData: SourceDataItem[],
  contentSources: ContentSourceDetails[]
) => {
  const combined = [] as CombinedDataItem[];
  serverData.forEach((serverItem) => {
    const type = serverItem.serviceType;
    const staticItem = staticData.find(({ serviceType }) => serviceType === type);
    const connectedSource = contentSources.find(({ serviceType }) => serviceType === type);
    combined.push({
      ...serverItem,
      ...staticItem,
      connected: !!connectedSource,
    } as CombinedDataItem);
  });

  return combined;
};
