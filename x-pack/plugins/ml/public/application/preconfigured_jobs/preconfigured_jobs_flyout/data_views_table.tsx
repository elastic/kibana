/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import type { EuiTableFieldDataColumnType, EuiTableActionsColumnType } from '@elastic/eui';
import { EuiButtonEmpty, EuiInMemoryTable } from '@elastic/eui';

import { useMlKibana, useMlLocator } from '../../contexts/kibana';
import type { DataViewInfo } from './overview_tab_content';
import { ML_PAGES } from '../../../../common/constants/locator';

interface Props {
  matchingDataViews: DataViewInfo[];
  moduleId: string;
}

export const DataViewsTable: FC<Props> = ({ matchingDataViews, moduleId }) => {
  const {
    services: {
      application: { navigateToUrl },
    },
  } = useMlKibana();
  const mlLocator = useMlLocator()!;

  const getUrl = useCallback(
    async (id: string) => {
      return await mlLocator.getUrl({
        page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_RECOGNIZER,
        pageState: {
          id: moduleId,
          index: id,
        },
      });
    },
    [mlLocator, moduleId]
  );

  const columns: Array<
    EuiTableFieldDataColumnType<DataViewInfo> | EuiTableActionsColumnType<DataViewInfo>
  > = [
    {
      field: 'title',
      name: i18n.translate(
        'xpack.ml.anomalyDetection.preconfiguredJobsFlyout.dataViewMatches.dataViewTitleColumnName',
        {
          defaultMessage: 'Data View',
        }
      ),
      sortable: true,
      truncateText: true,
    },
    {
      name: i18n.translate(
        'xpack.ml.anomalyDetection.preconfiguredJobsFlyout.dataViewMatches.actionsColumnName',
        {
          defaultMessage: 'Actions',
        }
      ),
      actions: [
        {
          render: (dataViewInfo: DataViewInfo) => {
            return (
              <EuiButtonEmpty
                isDisabled={false}
                color={'primary'}
                onClick={async () => {
                  const url = await getUrl(dataViewInfo.id);
                  navigateToUrl(url);
                }}
              >
                <FormattedMessage
                  id="xpack.ml.anomalyDetection.preconfiguredJobsFlyout.dataViewMatches.createJobAction"
                  defaultMessage="Create job from data view"
                />
              </EuiButtonEmpty>
            );
          },
          'data-test-subj': 'mlPreconfiguredJobsFlyoutActionCreate',
        },
      ],
      'data-test-subj': 'mlPreconfiguredJobsFlyoutColumnActions',
    },
  ];

  const sorting = {
    sort: {
      field: 'title',
      direction: 'desc' as const,
    },
  };

  return (
    <EuiInMemoryTable
      tableCaption="Demo of EuiInMemoryTable"
      items={matchingDataViews}
      columns={columns}
      pagination={true}
      sorting={sorting}
    />
  );
};
