/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Query } from 'react-apollo';
import { FlyoutItemQuery, InfraLogItem } from '../../graphql/types';
import { FlyoutVisibility } from '../../store/local/log_flyout';
import { flyoutItemQuery } from './flyout_item.gql_query';
import { WithFlyoutOptions } from './with_log_flyout_options';

interface WithFlyoutArgs {
  flyoutItem: InfraLogItem | null;
  setFlyoutItem: (id: string) => void;
  showFlyout: () => void;
  hideFlyout: () => void;
  error?: string | undefined;
  loading: boolean;
}

interface WithFlyoutProps {
  children: (args: WithFlyoutArgs) => React.ReactNode;
  sourceId: string;
}

export const WithLogFlyout = ({ children, sourceId }: WithFlyoutProps) => {
  return (
    <WithFlyoutOptions>
      {({ showFlyout, hideFlyout, setFlyoutItem, flyoutId, flyoutVisibility }) =>
        flyoutVisibility === FlyoutVisibility.visible ? (
          <Query<FlyoutItemQuery.Query, FlyoutItemQuery.Variables>
            query={flyoutItemQuery}
            fetchPolicy="no-cache"
            variables={{
              itemId: (flyoutId != null && flyoutId) || '',
              sourceId,
            }}
          >
            {({ data, error, loading }) => {
              return children({
                showFlyout,
                hideFlyout,
                setFlyoutItem,
                flyoutItem: (data && data.source && data.source.logItem) || null,
                error: error && error.message,
                loading,
              });
            }}
          </Query>
        ) : null
      }
    </WithFlyoutOptions>
  );
};
