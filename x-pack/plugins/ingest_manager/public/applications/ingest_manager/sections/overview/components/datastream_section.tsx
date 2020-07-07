/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiI18nNumber } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiTitle,
  EuiButtonEmpty,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { OverviewPanel } from './overview_panel';
import { OverviewStats } from './overview_stats';
import { useLink, useGetDataStreams, useStartDeps } from '../../../hooks';
import { Loading } from '../../fleet/components';

export const OverviewDatastreamSection: React.FC = () => {
  const { getHref } = useLink();
  const datastreamRequest = useGetDataStreams();
  const {
    data: { fieldFormats },
  } = useStartDeps();

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
    <EuiFlexItem component="section">
      <OverviewPanel>
        <header>
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="xpack.ingestManager.overviewPageDataStreamsPanelTitle"
                defaultMessage="Datasets"
              />
            </h2>
          </EuiTitle>
          <EuiButtonEmpty size="xs" flush="right" href={getHref('data_streams')}>
            <FormattedMessage
              id="xpack.ingestManager.overviewPageDataStreamsPanelAction"
              defaultMessage="View datasets"
            />
          </EuiButtonEmpty>
        </header>
        <OverviewStats>
          {datastreamRequest.isLoading ? (
            <Loading />
          ) : (
            <>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.ingestManager.overviewDatastreamTotalTitle"
                  defaultMessage="Datasets"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={total} />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.ingestManager.overviewDatastreamNamespacesTitle"
                  defaultMessage="Namespaces"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiI18nNumber value={namespaces.size} />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.ingestManager.overviewDatastreamSizeTitle"
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
