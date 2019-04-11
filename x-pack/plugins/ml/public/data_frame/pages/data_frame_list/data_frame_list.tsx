/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC, useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { toastNotifications } from 'ui/notify';

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiInMemoryTable,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

import { ml } from '../../../services/ml_api_service';

import { Dictionary } from '../../../../common/types/common';

type jobId = string;

interface DataFrameJob {
  dest: string;
  id: jobId;
  source: string;
}

interface DataFrameJobStats {
  id: jobId;
  state: Dictionary<any>;
  stats: Dictionary<any>;
}

interface DataFrameJobListRow {
  state: Dictionary<any>;
  stats: Dictionary<any>;
  config: DataFrameJob;
}

interface GetDataFrameTransformsResponse {
  count: number;
  transforms: DataFrameJob[];
}

interface GetDataFrameTransformsStatsResponse {
  count: number;
  transforms: DataFrameJobStats[];
}

// Used to pass on attribute names to table columns
enum DataFrameJobListColumn {
  dest = 'config.dest',
  id = 'config.id',
  source = 'config.source',
}

type ItemIdToExpandedRowMap = Dictionary<JSX.Element>;

export const DataFrameList: SFC = () => {
  const [dataFrameJobs, setDataFrameJobs] = useState([] as DataFrameJobListRow[]);

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState(
    {} as ItemIdToExpandedRowMap
  );

  function toggleDetails(item: DataFrameJobListRow) {
    if (itemIdToExpandedRowMap[item.config.id]) {
      delete itemIdToExpandedRowMap[item.config.id];
    } else {
      itemIdToExpandedRowMap[item.config.id] = <div>EXPAND {item.config.id}</div>;
    }
    // spread to a new object otherwise the component wouldn't re-render
    setItemIdToExpandedRowMap({ ...itemIdToExpandedRowMap });
  }

  const getJobs = async () => {
    try {
      const jobConfigs: GetDataFrameTransformsResponse = await ml.dataFrame.getDataFrameTransforms();
      const jobStats: GetDataFrameTransformsStatsResponse = await ml.dataFrame.getDataFrameTransformsStats();

      const tableRows = jobConfigs.transforms.map(config => {
        const stats = jobStats.transforms.find(d => config.id === d.id);

        if (stats === undefined) {
          return { config, state: {}, stats: {} };
        }

        return { config, state: stats.state, stats: stats.stats };
      });

      setDataFrameJobs(tableRows);
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.jobsList.errorGettingDataFrameJobsList', {
          defaultMessage: 'An error occurred getting the data frame jobs list: {error}',
          values: { error: JSON.stringify(e) },
        })
      );
    }
  };

  // use this pattern so we don't return a promise
  useEffect(() => {
    getJobs();
  }, []);

  if (dataFrameJobs.length === 0) {
    return <EuiEmptyPrompt title={<h2>Here be Data Frame dragons!</h2>} iconType="editorStrike" />;
  }

  const startDataFrameJob = async (d: DataFrameJobListRow) => {
    try {
      await ml.dataFrame.startDataFrameTransformsJob(d.config.id);
      toastNotifications.addSuccess(
        i18n.translate('xpack.ml.dataframe.jobsList.startJobSuccessMessage', {
          defaultMessage: 'Data frame job {jobId} started successfully.',
          values: { jobId: d.config.id },
        })
      );
      getJobs();
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.jobsList.startJobErrorMessage', {
          defaultMessage: 'An error occurred starting the data frame job {jobId}: {error}',
          values: { jobId: d.config.id, error: JSON.stringify(e) },
        })
      );
    }
  };

  const stopDataFrameJob = async (d: DataFrameJobListRow) => {
    try {
      await ml.dataFrame.stopDataFrameTransformsJob(d.config.id);
      getJobs();
      toastNotifications.addSuccess(
        i18n.translate('xpack.ml.dataframe.jobsList.stopJobSuccessMessage', {
          defaultMessage: 'Data frame job {jobId} stopped successfully.',
          values: { jobId: d.config.id },
        })
      );
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.jobsList.stopJobErrorMessage', {
          defaultMessage: 'An error occurred stopping the data frame job {jobId}: {error}',
          values: { jobId: d.config.id, error: JSON.stringify(e) },
        })
      );
    }
  };

  const deleteDataFrameJob = async (d: DataFrameJobListRow) => {
    try {
      await ml.dataFrame.deleteDataFrameTransformsJob(d.config.id);
      getJobs();
      toastNotifications.addSuccess(
        i18n.translate('xpack.ml.dataframe.jobsList.deleteJobSuccessMessage', {
          defaultMessage: 'Data frame job {jobId} deleted successfully.',
          values: { jobId: d.config.id },
        })
      );
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.jobsList.deleteJobErrorMessage', {
          defaultMessage: 'An error occurred deleting the data frame job {jobId}: {error}',
          values: { jobId: d.config.id, error: JSON.stringify(e) },
        })
      );
    }
  };

  const actions = [
    {
      isPrimary: true,
      render: (item: DataFrameJobListRow) => {
        if (item.state.transform_state !== 'started') {
          return (
            <EuiButtonEmpty iconType="play" onClick={() => startDataFrameJob(item)}>
              {i18n.translate('xpack.ml.dataframe.jobsList.startActionName', {
                defaultMessage: 'Start',
              })}
            </EuiButtonEmpty>
          );
        }

        return (
          <EuiButtonEmpty color="danger" iconType="stop" onClick={() => stopDataFrameJob(item)}>
            {i18n.translate('xpack.ml.dataframe.jobsList.stopActionName', {
              defaultMessage: 'Stop',
            })}
          </EuiButtonEmpty>
        );
      },
    },
    {
      render: (item: DataFrameJobListRow) => {
        return (
          <EuiButtonEmpty
            color="danger"
            disabled={item.state.transform_state === 'started'}
            iconType="trash"
            onClick={() => deleteDataFrameJob(item)}
          >
            {i18n.translate('xpack.ml.dataframe.jobsList.deleteActionName', {
              defaultMessage: 'Delete',
            })}
          </EuiButtonEmpty>
        );
      },
    },
  ];

  const columns = [
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: (item: DataFrameJobListRow) => (
        <EuiButtonIcon
          onClick={() => toggleDetails(item)}
          aria-label={
            itemIdToExpandedRowMap[item.config.id]
              ? i18n.translate('xpack.ml.dataframe.jobsList.rowCollapse', {
                  defaultMessage: 'Collapse',
                })
              : i18n.translate('xpack.ml.dataframe.jobsList.rowExpand', {
                  defaultMessage: 'Expand',
                })
          }
          iconType={itemIdToExpandedRowMap[item.config.id] ? 'arrowUp' : 'arrowDown'}
        />
      ),
    },
    {
      field: DataFrameJobListColumn.id,
      name: 'ID',
      sortable: true,
      truncateText: true,
    },
    {
      field: DataFrameJobListColumn.source,
      name: i18n.translate('xpack.ml.dataframe.sourceIndex', { defaultMessage: 'Source index' }),
      sortable: true,
      truncateText: true,
    },
    {
      field: DataFrameJobListColumn.dest,
      name: i18n.translate('xpack.ml.dataframe.targetIndex', { defaultMessage: 'Target index' }),
      sortable: true,
      truncateText: true,
    },
    {
      name: i18n.translate('xpack.ml.dataframe.tableActionLabel', { defaultMessage: 'Actions' }),
      actions,
    },
  ];

  return (
    <EuiInMemoryTable
      items={dataFrameJobs}
      columns={columns}
      pagination={true}
      hasActions={false}
      isSelectable={false}
      itemId={DataFrameJobListColumn.id}
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      isExpandable={true}
    />
  );
};
