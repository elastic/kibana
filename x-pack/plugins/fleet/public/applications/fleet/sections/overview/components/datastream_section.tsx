/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexItem,
  EuiI18nNumber,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { OverviewPanel } from './overview_panel';
import { OverviewStats } from './overview_stats';
import { useLink, useGetDataStreams, useStartServices } from '../../../hooks';
import { Loading } from '../../agents/components';

export const OverviewDatastreamSection: React.FC = () => {
  const { getHref } = useLink();
  const datastreamRequest = useGetDataStreams();
  const {
    data: { fieldFormats },
  } = useStartServices();

  const total = datastreamRequest.data?.data_streams?.length ?? 0;
  let sizeBytes = 0;
  const namespaces = new Set<string>();
  if (datastreamRequest.data) {
    datastreamRequest.data.data_streams.forEach((val) => {
      namespaces.add(val.namespace);
      sizeBytes += val.size_in_bytes;
    });
  }

  let size: string;
  try {
    const formatter = fieldFormats.getInstance('bytes');
    size = formatter.convert(sizeBytes);
  } catch (e) {
    size = `${sizeBytes}b`;
  }

  return (
    <EuiFlexItem component="section" data-test-subj="fleet-datastream-section">
      <OverviewPanel
        title={i18n.translate('xpack.fleet.overviewPageDataStreamsPanelTitle', {
          defaultMessage: 'Data streams',
        })}
        tooltip={i18n.translate('xpack.fleet.overviewPageDataStreamsPanelTooltip', {
          defaultMessage: 'Data that your agents collect are organized into various data streams.',
        })}
        linkTo={getHref('data_streams')}
        linkToText={i18n.translate('xpack.fleet.overviewPageDataStreamsPanelAction', {
          defaultMessage: 'View data streams',
        })}
      >
        <OverviewStats>
          {datastreamRequest.isLoading ? (
            <Loading />
          ) : (
            <>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.fleet.overviewDatastreamTotalTitle"
                  defaultMessage="Data streams"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={total} />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.fleet.overviewDatastreamNamespacesTitle"
                  defaultMessage="Namespaces"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={namespaces.size} />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.fleet.overviewDatastreamSizeTitle"
                  defaultMessage="Total size"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>{size}</EuiDescriptionListDescription>
            </>
          )}
        </OverviewStats>
      </OverviewPanel>
    </EuiFlexItem>
  );
};
