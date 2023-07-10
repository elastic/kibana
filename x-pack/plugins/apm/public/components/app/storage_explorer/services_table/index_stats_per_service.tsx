/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ValuesType } from 'utility-types';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import {
  asDynamicBytes,
  asInteger,
} from '../../../../../common/utils/formatters';
import { FETCH_STATUS, isPending } from '../../../../hooks/use_fetcher';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { SizeLabel } from './size_label';
import { getIndexManagementHref } from '../get_storage_explorer_links';

type StorageExplorerIndicesStats =
  APIReturnType<'GET /internal/apm/services/{serviceName}/storage_details'>['indicesStats'];

interface Props {
  indicesStats: StorageExplorerIndicesStats;
  status: FETCH_STATUS;
}

export function IndexStatsPerService({ indicesStats, status }: Props) {
  const { core } = useApmPluginContext();

  const columns: Array<
    EuiBasicTableColumn<ValuesType<StorageExplorerIndicesStats>>
  > = [
    {
      field: 'indexName',
      name: i18n.translate('xpack.apm.storageExplorer.indicesStats.indexName', {
        defaultMessage: 'Name',
      }),
      sortable: true,
    },
    {
      field: 'primary',
      name: i18n.translate('xpack.apm.storageExplorer.indicesStats.primaries', {
        defaultMessage: 'Primaries',
      }),
      render: (_, { primary }) => primary ?? NOT_AVAILABLE_LABEL,
      sortable: true,
    },
    {
      field: 'replica',
      name: i18n.translate('xpack.apm.storageExplorer.indicesStats.replicas', {
        defaultMessage: 'Replicas',
      }),
      render: (_, { replica }) => replica ?? NOT_AVAILABLE_LABEL,
      sortable: true,
    },
    {
      field: 'numberOfDocs',
      name: i18n.translate(
        'xpack.apm.storageExplorer.indicesStats.numberOfDocs',
        {
          defaultMessage: 'Docs count',
        }
      ),
      render: (_, { numberOfDocs }) => asInteger(numberOfDocs),
      sortable: true,
    },
    {
      field: 'size',
      name: <SizeLabel />,
      render: (_, { size }) => asDynamicBytes(size) ?? NOT_AVAILABLE_LABEL,
      sortable: true,
    },
    {
      field: 'dataStream',
      name: i18n.translate(
        'xpack.apm.storageExplorer.indicesStats.dataStream',
        {
          defaultMessage: 'Data stream',
        }
      ),
      render: (_, { dataStream }) =>
        (
          <EuiLink
            data-test-subj="storageExplorerIndexManagementDataStreamLink"
            href={getIndexManagementHref(core, dataStream)}
          >
            {dataStream}
          </EuiLink>
        ) ?? NOT_AVAILABLE_LABEL,
      sortable: true,
    },
    {
      field: 'lifecyclePhase',
      name: i18n.translate(
        'xpack.apm.storageExplorer.indicesStats.lifecyclePhase',
        {
          defaultMessage: 'Lifecycle phase',
        }
      ),
      render: (_, { lifecyclePhase }) => lifecyclePhase ?? NOT_AVAILABLE_LABEL,
      sortable: true,
    },
  ];

  const loading = isPending(status);

  return (
    <>
      <EuiTitle size="xs">
        <h5>
          {i18n.translate('xpack.apm.storageExplorer.indicesStats.title', {
            defaultMessage: 'Indices breakdown',
          })}
        </h5>
      </EuiTitle>
      <EuiSpacer />
      <EuiPanel>
        <EuiInMemoryTable
          tableCaption={i18n.translate(
            'xpack.apm.storageExplorer.indicesStats.table.caption',
            {
              defaultMessage: 'Storage Explorer indices breakdown',
            }
          )}
          items={indicesStats}
          columns={columns}
          pagination={true}
          sorting={true}
          loading={loading}
          data-test-subj="storageExplorerIndicesStatsTable"
          error={
            status === FETCH_STATUS.FAILURE
              ? i18n.translate(
                  'xpack.apm.storageExplorer.indicesStats.table.errorMessage',
                  {
                    defaultMessage: 'Failed to fetch',
                  }
                )
              : ''
          }
          message={
            loading
              ? i18n.translate(
                  'xpack.apm.storageExplorer.indicesStats.table.loading',
                  {
                    defaultMessage: 'Loading...',
                  }
                )
              : i18n.translate(
                  'xpack.apm.storageExplorer.indicesStats.table.noResults',
                  {
                    defaultMessage: 'No data found',
                  }
                )
          }
        />
      </EuiPanel>
    </>
  );
}
