/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';

import { DataFrameJobListRow } from './common';
import { deleteJobFactory, startJobFactory, stopJobFactory } from './job_service';

export const getActions = (getJobs: () => void) => {
  const deleteJob = deleteJobFactory(getJobs);
  const startJob = startJobFactory(getJobs);
  const stopJob = stopJobFactory(getJobs);

  return [
    {
      isPrimary: true,
      render: (item: DataFrameJobListRow) => {
        if (item.state.transform_state !== 'started') {
          return (
            <EuiButtonEmpty iconType="play" onClick={() => startJob(item)}>
              {i18n.translate('xpack.ml.dataframe.jobsList.startActionName', {
                defaultMessage: 'Start',
              })}
            </EuiButtonEmpty>
          );
        }

        return (
          <EuiButtonEmpty color="danger" iconType="stop" onClick={() => stopJob(item)}>
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
            onClick={() => deleteJob(item)}
          >
            {i18n.translate('xpack.ml.dataframe.jobsList.deleteActionName', {
              defaultMessage: 'Delete',
            })}
          </EuiButtonEmpty>
        );
      },
    },
  ];
};
