/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, findIndex } from 'lodash';

import { kea, MakeLogicType } from 'kea';

import http from 'shared/http';
import routes from 'workplace_search/routes';

import { handleAPIError } from 'app_search/utils/handleAPIError';
import { IFlashMessagesProps } from 'shared/types';
import {
  IConnector,
  IContentSourceDetails,
  IContentSourceStatus,
  IObject,
  ISourceDataItem,
} from 'workplace_search/types';

import { staticSourceData } from 'workplace_search/ContentSources/sourceData';

import { AppLogic } from 'workplace_search/App/AppLogic';

export interface ISourcesActions {
  setServerSourceStatuses(statuses: IContentSourceStatus[]): IContentSourceStatus[];
  onInitializeSources(serverResponse: ISourcesServerResponse): ISourcesServerResponse;
  setFlashMessages(flashMessages: IFlashMessagesProps): { flashMessages: IFlashMessagesProps };
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

export interface ISourcesValues {
  contentSources: IContentSourceDetails[];
  privateContentSources: IContentSourceDetails[];
  sourceData: ISourceDataItem[];
  availableSources: ISourceDataItem[];
  configuredSources: ISourceDataItem[];
  serviceTypes: IConnector[];
  flashMessages: IFlashMessagesProps;
  permissionsModal: IPermissionsModalProps | null;
  dataLoading: boolean;
  serverStatuses: IObject | null;
}

interface ISourcesServerResponse {
  contentSources: IContentSourceDetails[];
  privateContentSources?: IContentSourceDetails[];
  serviceTypes: IConnector[];
}

export const SourcesLogic = kea<MakeLogicType<ISourcesValues, ISourcesActions>>({
  actions: {
    setServerSourceStatuses: (statuses: IContentSourceStatus[]) => statuses,
    onInitializeSources: (serverResponse: ISourcesServerResponse) => serverResponse,
    setFlashMessages: (flashMessages: IFlashMessagesProps) => ({ flashMessages }),
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
    flashMessages: [
      {},
      {
        setFlashMessages: (_, { flashMessages }) => flashMessages,
        setAddedSource: (_, { addedSourceName, additionalConfiguration }) => ({
          success: [
            [
              `Successfully connected ${addedSourceName}.`,
              additionalConfiguration ? 'This source requires additional configuration.' : '',
            ].join(' '),
          ],
        }),
        resetFlashMessages: () => ({}),
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
          const serverStatuses = {};
          sources.forEach((source) => {
            serverStatuses[source.id] = source.status.status;
          });
          return serverStatuses;
        },
      },
    ],
  },
  selectors: ({ selectors }) => ({
    availableSources: [
      () => [selectors.sourceData],
      (sourceData) => sourceData.filter(({ configured }) => !configured),
    ],
    configuredSources: [
      () => [selectors.sourceData],
      (sourceData) => sourceData.filter(({ configured }) => configured),
    ],
    sourceData: [
      () => [selectors.serviceTypes, selectors.contentSources],
      (serviceTypes, contentSources) =>
        mergeServerAndStaticData(serviceTypes, staticSourceData, contentSources),
    ],
  }),
  listeners: ({ actions, values }) => ({
    initializeSources: () => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? routes.fritoPieOrganizationContentSourcesPath()
        : routes.fritoPieAccountContentSourcesPath();

      http(route)
        .then(({ data }) => actions.onInitializeSources(data))
        .catch(handleAPIError((messages) => actions.setFlashMessages({ error: messages })));

      if (isOrganization && !values.serverStatuses) {
        // We want to get the initial statuses from the server to compare our polling results to.
        fetchSourceStatuses(isOrganization, actions).then((sources: IContentSourceStatus[]) =>
          actions.setServerSourceStatuses(sources)
        );
      }
    },
    // We poll the server and if the status update, we trigger a new fetch of the sources.
    pollForSourceStatusChanges: () => {
      const { isOrganization } = AppLogic.values;
      if (!isOrganization) return;
      const serverStatuses = values.serverStatuses;
      fetchSourceStatuses(isOrganization, actions).then((sources: IContentSourceStatus[]) => {
        sources.some((source) => {
          if (serverStatuses && serverStatuses[source.id] !== source.status.status) {
            return actions.initializeSources();
          }
        });
      });
    },
    setSourceSearchability: ({ sourceId, searchable }) => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? routes.fritoPieOrganizationContentSourceSearchablePath(sourceId)
        : routes.fritoPieAccountContentSourceSearchablePath(sourceId);

      http
        .put(route, { searchable })
        .then(() => actions.onSetSearchability(sourceId, searchable))
        .catch(handleAPIError((messages) => actions.setFlashMessages({ error: messages })));
    },
  }),
});

const fetchSourceStatuses = (isOrganization, actions) => {
  const route = isOrganization
    ? routes.statusFritoPieAccountContentSourcesPath()
    : routes.statusFritoPieOrganizationContentSourcesPath();

  return http(route)
    .then(({ data }) => data)
    .catch(handleAPIError((messages) => actions.setFlashMessages({ error: messages })));
};

const updateSourcesOnToggle = (contentSources, sourceId, searchable) => {
  if (!contentSources) return false;
  const sources = cloneDeep(contentSources);
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
const mergeServerAndStaticData = (serverData, staticData, contentSources) => {
  const combined = [] as ISourceDataItem[];
  serverData.forEach((serverItem) => {
    const type = serverItem.serviceType;
    const staticItem = staticData.find(({ serviceType }) => serviceType === type);
    const connectedSource = contentSources.find(({ serviceType }) => serviceType === type);
    combined.push({
      ...serverItem,
      ...staticItem,
      connected: !!connectedSource,
    });
  });

  return combined;
};
