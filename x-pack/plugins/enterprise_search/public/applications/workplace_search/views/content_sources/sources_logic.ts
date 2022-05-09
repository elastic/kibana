/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType, isBreakpoint } from 'kea';
import type { BreakPointFunction } from 'kea';
import { cloneDeep, findIndex } from 'lodash';

import { i18n } from '@kbn/i18n';

import { flashAPIErrors, flashSuccessToast } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { AppLogic } from '../../app_logic';
import { Connector, ContentSourceDetails, ContentSourceStatus, SourceDataItem } from '../../types';
import { sortByName } from '../../utils';

import { staticSourceData } from './source_data';

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

type CombinedDataItem = SourceDataItem & { connected: boolean };

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
  externalConfigured: boolean;
}

interface ISourcesServerResponse {
  contentSources: ContentSourceDetails[];
  privateContentSources?: ContentSourceDetails[];
  serviceTypes: Connector[];
}

let pollingInterval: number;
export const POLLING_INTERVAL = 10000;

export const SourcesLogic = kea<MakeLogicType<ISourcesValues, ISourcesActions>>({
  path: ['enterprise_search', 'workplace_search', 'sources_logic'],
  actions: {
    setServerSourceStatuses: (statuses: ContentSourceStatus[]) => statuses,
    onInitializeSources: (serverResponse: ISourcesServerResponse) => serverResponse,
    onSetSearchability: (sourceId: string, searchable: boolean) => ({ sourceId, searchable }),
    setAddedSource: (
      addedSourceName: string,
      additionalConfiguration: boolean,
      serviceType: string
    ) => ({ addedSourceName, additionalConfiguration, serviceType }),
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
      (sourceData: SourceDataItem[]) =>
        sortByName(sourceData.filter(({ configured }) => !configured)),
    ],
    configuredSources: [
      () => [selectors.sourceData],
      (sourceData: SourceDataItem[]) =>
        sortByName(sourceData.filter(({ configured }) => configured)),
    ],
    externalConfigured: [
      () => [selectors.configuredSources],
      (configuredSources: SourceDataItem[]) =>
        !!configuredSources.find((item) => item.serviceType === 'external'),
    ],
    sourceData: [
      () => [selectors.serviceTypes, selectors.contentSources],
      (serviceTypes, contentSources) =>
        mergeServerAndStaticData(serviceTypes, staticSourceData, contentSources),
    ],
  }),
  listeners: ({ actions, values }) => ({
    initializeSources: async (_, breakpoint) => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? '/internal/workplace_search/org/sources'
        : '/internal/workplace_search/account/sources';

      try {
        const response = await HttpLogic.values.http.get<ISourcesServerResponse>(route);
        breakpoint(); // Prevents errors if logic unmounts while fetching
        actions.pollForSourceStatusChanges();
        actions.onInitializeSources(response);
      } catch (e) {
        if (isBreakpoint(e)) {
          return; // do not continue if logic is unmounted
        } else {
          flashAPIErrors(e);
        }
      }

      if (isOrganization && !values.serverStatuses) {
        // We want to get the initial statuses from the server to compare our polling results to.
        const sourceStatuses = await fetchSourceStatuses(isOrganization, breakpoint);
        actions.setServerSourceStatuses(sourceStatuses ?? []);
      }
    },
    // We poll the server and if the status update, we trigger a new fetch of the sources.
    pollForSourceStatusChanges: (_, breakpoint) => {
      const { isOrganization } = AppLogic.values;
      if (!isOrganization) return;
      const serverStatuses = values.serverStatuses;

      pollingInterval = window.setInterval(async () => {
        const sourceStatuses = await fetchSourceStatuses(isOrganization, breakpoint);

        (sourceStatuses ?? []).some((source: ContentSourceStatus) => {
          if (serverStatuses && serverStatuses[source.id] !== source.status.status) {
            return actions.initializeSources();
          }
        });
      }, POLLING_INTERVAL);
    },
    setSourceSearchability: async ({ sourceId, searchable }) => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? `/internal/workplace_search/org/sources/${sourceId}/searchable`
        : `/internal/workplace_search/account/sources/${sourceId}/searchable`;

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

      flashSuccessToast(
        [
          successfullyConnectedMessage,
          additionalConfiguration ? additionalConfigurationMessage : '',
        ].join(' ')
      );
    },
    resetSourcesState: () => {
      clearInterval(pollingInterval);
    },
  }),
  events: () => ({
    beforeUnmount() {
      clearInterval(pollingInterval);
    },
  }),
});

export const fetchSourceStatuses = async (
  isOrganization: boolean,
  breakpoint: BreakPointFunction
): Promise<ContentSourceStatus[] | undefined> => {
  const route = isOrganization
    ? '/internal/workplace_search/org/sources/status'
    : '/internal/workplace_search/account/sources/status';
  let response;

  try {
    response = await HttpLogic.values.http.get<ContentSourceStatus[]>(route);
    breakpoint();
    SourcesLogic.actions.setServerSourceStatuses(response);
  } catch (e) {
    if (isBreakpoint(e)) {
      // Do nothing, silence the error
    } else {
      flashAPIErrors(e);
    }
  }

  return response;
};

const updateSourcesOnToggle = (
  contentSources: ContentSourceDetails[],
  sourceId: string,
  searchable: boolean
): ContentSourceDetails[] => {
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
 * Finally, also in the collection response is the current set of connected sources. We check for the
 * existence of a `connectedSource` of the type in the loop and set `connected` to true so that the UI
 * can diplay "Add New" instead of "Connect", the latter of which is displated only when a connector
 * has been configured but there are no connected sources yet.
 */
export const mergeServerAndStaticData = (
  serverData: Connector[],
  staticData: SourceDataItem[],
  contentSources: ContentSourceDetails[]
): CombinedDataItem[] => {
  const unsortedData = staticData.map((staticItem) => {
    const serverItem = serverData.find(({ serviceType }) => serviceType === staticItem.serviceType);
    const connectedSource = contentSources.find(
      ({ serviceType }) => serviceType === staticItem.serviceType
    );
    return {
      ...staticItem,
      ...serverItem,
      connected: !!connectedSource,
    };
  });
  return sortByName(unsortedData);
};
