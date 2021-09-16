/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect, useCallback } from 'react';
import { estypes } from '@elastic/elasticsearch';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { JOB_STATE } from '../../../../common';

interface Props {
  jobCount?: number;
  jobIds?: string[];
}

function isJobAwaitingNodeAssignment(job: estypes.MlJobStats) {
  return job.node === undefined && job.state === JOB_STATE.OPENING;
}

export const MLJobsAwaitingNodeWarning: FC<Props> = ({ jobCount, jobIds }) => {
  const { http } = useKibana().services;

  const [unassignedJobCount, setUnassignedJobCount] = useState<null | number>(0);

  const checkNodes = useCallback(async () => {
    try {
      const { lazyNodeCount } = await http!.fetch<{ lazyNodeCount: number }>(
        '/api/ml/ml_node_count'
      );
      if (lazyNodeCount === 0) {
        return;
      }

      if (jobIds?.length) {
        //
        const { jobs } = await http!.fetch<estypes.MlGetJobStatsResponse>(
          `/api/ml/anomaly_detectors/${jobIds.join(',')}/_stats`
        );
        const unassignedJobs = jobs.filter((j) => isJobAwaitingNodeAssignment(j));
        setUnassignedJobCount(unassignedJobs.length);
      } else if (jobCount === undefined && jobIds === undefined) {
        setUnassignedJobCount(null);
      } else if (jobCount !== undefined && jobCount > 0) {
        setUnassignedJobCount(jobCount);
      }
    } catch (error) {
      setUnassignedJobCount(null);
      // eslint-disable-next-line no-console
      console.error('Could not determine ML node information', error);
    }
  }, [jobCount, jobIds]);

  useEffect(() => {
    checkNodes();
  }, [jobCount, jobIds]);

  if (unassignedJobCount === 0) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.ml.jobsAwaitingNodeWarning.title"
            defaultMessage="Awaiting machine learning node"
          />
        }
        color="primary"
        iconType="iInCircle"
      >
        <div>
          {unassignedJobCount === null ? (
            <FormattedMessage
              id="xpack.ml.jobsAwaitingNodeWarning.unknownJobCount.noMLNodesAvailableDescription"
              defaultMessage="Some jobs are waiting for machine learning nodes to start."
            />
          ) : (
            <FormattedMessage
              id="xpack.ml.jobsAwaitingNodeWarning.knownJobCount.noMLNodesAvailableDescription"
              defaultMessage="There {jobCount, plural, one {is} other {are}} {jobCount, plural, one {# job} other {# jobs}} waiting for machine learning nodes to start."
              values={{
                jobCount: unassignedJobCount,
              }}
            />
          )}
        </div>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
