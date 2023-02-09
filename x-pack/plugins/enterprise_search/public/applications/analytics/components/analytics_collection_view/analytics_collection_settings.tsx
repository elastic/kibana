/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiButton,
  EuiDescriptionList,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AnalyticsCollection } from '../../../../../common/types/analytics';

import { DeleteAnalyticsCollectionLogic } from './delete_analytics_collection_logic';

interface AnalyticsCollectionSettingsProps {
  collection: AnalyticsCollection;
}

export const AnalyticsCollectionSettings: React.FC<AnalyticsCollectionSettingsProps> = ({
  collection,
}) => {
  const { deleteAnalyticsCollection } = useActions(DeleteAnalyticsCollectionLogic);
  const { isLoading } = useValues(DeleteAnalyticsCollectionLogic);

  return (
    <>
      <EuiPanel hasShadow={false} color="subdued" paddingSize="xl" grow={false}>
        <EuiDescriptionList
          listItems={[
            {
              title: i18n.translate(
                'xpack.enterpriseSearch.analytics.collections.collectionsView.settingsTab.details.collectionName',
                {
                  defaultMessage: 'Collection name',
                }
              ),
              description: collection.name,
            },
            {
              title: i18n.translate(
                'xpack.enterpriseSearch.analytics.collections.collectionsView.settingsTab.details.eventsDataStreamName',
                {
                  defaultMessage: 'Events Datastream Index',
                }
              ),
              description: collection.events_datastream,
            },
          ]}
          type="column"
          align="center"
        />
      </EuiPanel>
      <EuiSpacer size="l" />
      <EuiPanel hasShadow={false} color="danger" paddingSize="l">
        <EuiTitle size="s">
          <h4>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.settingsTab.delete.headingTitle',
              {
                defaultMessage: 'Delete this analytics collection',
              }
            )}
          </h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collections.collectionsView.settingsTab.delete.warning',
              {
                defaultMessage: 'This action is irreversible',
              }
            )}
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiButton
          fill
          type="submit"
          color="danger"
          isLoading={!isLoading}
          disabled={!isLoading}
          onClick={() => {
            deleteAnalyticsCollection(collection.id);
          }}
        >
          {i18n.translate(
            'xpack.enterpriseSearch.analytics.collections.collectionsView.settingsTab.delete.buttonTitle',
            {
              defaultMessage: 'Delete this collection',
            }
          )}
        </EuiButton>
      </EuiPanel>
    </>
  );
};
