/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { isString } from 'lodash';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { FlyoutItemQuery, InfraLogItem } from '../../graphql/types';
import { useApolloClient } from '../../utils/apollo_context';
import { UrlStateContainer } from '../../utils/url_state';
import { useTrackedPromise } from '../../utils/use_tracked_promise';
import { flyoutItemQuery } from './flyout_item.gql_query';

export enum FlyoutVisibility {
  hidden = 'hidden',
  visible = 'visible',
}

interface FlyoutOptionsUrlState {
  flyoutId?: string | null;
  flyoutVisibility?: string | null;
  surroundingLogsId?: string | null;
}

export const useLogFlyout = ({ sourceId }: { sourceId: string }) => {
  const [flyoutVisible, setFlyoutVisibility] = useState<boolean>(false);
  const [flyoutId, setFlyoutId] = useState<string | null>(null);
  const [flyoutItem, setFlyoutItem] = useState<InfraLogItem | null>(null);
  const [surroundingLogsId, setSurroundingLogsId] = useState<string | null>(null);

  const apolloClient = useApolloClient();

  const [loadFlyoutItemRequest, loadFlyoutItem] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async () => {
        if (!apolloClient) {
          throw new Error('Failed to load flyout item: No apollo client available.');
        }

        if (!flyoutId) {
          return;
        }

        return await apolloClient.query<FlyoutItemQuery.Query, FlyoutItemQuery.Variables>({
          fetchPolicy: 'no-cache',
          query: flyoutItemQuery,
          variables: {
            itemId: flyoutId,
            sourceId,
          },
        });
      },
      onResolve: response => {
        if (response) {
          const { data } = response;
          setFlyoutItem((data && data.source && data.source.logItem) || null);
        }
      },
    },
    [apolloClient, sourceId, flyoutId]
  );

  const isLoading = useMemo(
    () => {
      return loadFlyoutItemRequest.state === 'pending';
    },
    [loadFlyoutItemRequest.state]
  );

  useEffect(
    () => {
      if (flyoutId) {
        loadFlyoutItem();
      }
    },
    [loadFlyoutItem, flyoutId]
  );

  return {
    flyoutVisible,
    setFlyoutVisibility,
    flyoutId,
    setFlyoutId,
    surroundingLogsId,
    setSurroundingLogsId,
    isLoading,
    flyoutItem,
  };
};

export const LogFlyout = createContainer(useLogFlyout);

export const WithFlyoutOptionsUrlState = () => {
  const {
    flyoutVisible,
    setFlyoutVisibility,
    flyoutId,
    setFlyoutId,
    surroundingLogsId,
    setSurroundingLogsId,
  } = useContext(LogFlyout.Context);

  return (
    <UrlStateContainer
      urlState={{
        flyoutVisibility: flyoutVisible ? FlyoutVisibility.visible : FlyoutVisibility.hidden,
        flyoutId,
        surroundingLogsId,
      }}
      urlStateKey="flyoutOptions"
      mapToUrlState={mapToUrlState}
      onChange={newUrlState => {
        if (newUrlState && newUrlState.flyoutId) {
          setFlyoutId(newUrlState.flyoutId);
        }
        if (newUrlState && newUrlState.surroundingLogsId) {
          setSurroundingLogsId(newUrlState.surroundingLogsId);
        }
        if (newUrlState && newUrlState.flyoutVisibility === FlyoutVisibility.visible) {
          setFlyoutVisibility(true);
        }
        if (newUrlState && newUrlState.flyoutVisibility === FlyoutVisibility.hidden) {
          setFlyoutVisibility(false);
        }
      }}
      onInitialize={initialUrlState => {
        if (initialUrlState && initialUrlState.flyoutId) {
          setFlyoutId(initialUrlState.flyoutId);
        }
        if (initialUrlState && initialUrlState.surroundingLogsId) {
          setSurroundingLogsId(initialUrlState.surroundingLogsId);
        }
        if (initialUrlState && initialUrlState.flyoutVisibility === FlyoutVisibility.visible) {
          setFlyoutVisibility(true);
        }
        if (initialUrlState && initialUrlState.flyoutVisibility === FlyoutVisibility.hidden) {
          setFlyoutVisibility(false);
        }
      }}
    />
  );
};

const mapToUrlState = (value: any): FlyoutOptionsUrlState | undefined =>
  value
    ? {
        flyoutId: mapToFlyoutIdState(value.flyoutId),
        flyoutVisibility: mapToFlyoutVisibilityState(value.flyoutVisibility),
        surroundingLogsId: mapToSurroundingLogsIdState(value.surroundingLogsId),
      }
    : undefined;

const mapToFlyoutIdState = (subject: any) => {
  return subject && isString(subject) ? subject : undefined;
};
const mapToSurroundingLogsIdState = (subject: any) => {
  return subject && isString(subject) ? subject : undefined;
};
const mapToFlyoutVisibilityState = (subject: any) => {
  if (subject) {
    if (subject === 'visible') {
      return FlyoutVisibility.visible;
    }
    if (subject === 'hidden') {
      return FlyoutVisibility.hidden;
    }
  }
};
