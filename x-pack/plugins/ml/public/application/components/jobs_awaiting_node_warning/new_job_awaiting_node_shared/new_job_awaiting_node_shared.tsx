/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { EuiCallOut, EuiSpacer, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { JOB_STATE } from '../../../../../common/constants/states';
import { mlApiServicesProvider } from '../../../services/ml_api_service';
import { HttpService } from '../../../services/http_service';
import { extractDeploymentId, CloudInfo } from '../../../services/ml_server_info';

interface Props {
  jobIds: string[];
}

function isJobAwaitingNodeAssignment(job: estypes.MlJobStats) {
  return job.node === undefined && job.state === JOB_STATE.OPENING;
}

const MLJobsAwaitingNodeWarning: FC<Props> = ({ jobIds }) => {
  const { http } = useKibana().services;
  const ml = useMemo(() => mlApiServicesProvider(new HttpService(http!)), [http]);

  const [unassignedJobCount, setUnassignedJobCount] = useState<number>(0);
  const [cloudInfo, setCloudInfo] = useState<CloudInfo | null>(null);

  const checkNodes = useCallback(async () => {
    try {
      if (jobIds.length === 0) {
        setUnassignedJobCount(0);
        return;
      }

      const { lazyNodeCount } = await ml.mlNodeCount();
      if (lazyNodeCount === 0) {
        setUnassignedJobCount(0);
        return;
      }

      const { jobs } = await ml.getJobStats({ jobId: jobIds.join(',') });
      const unassignedJobs = jobs.filter(isJobAwaitingNodeAssignment);
      setUnassignedJobCount(unassignedJobs.length);
    } catch (error) {
      setUnassignedJobCount(0);
      // eslint-disable-next-line no-console
      console.error('Could not determine ML node information', error);
    }
  }, [jobIds]);

  const checkCloudInfo = useCallback(async () => {
    if (unassignedJobCount === 0) {
      return;
    }

    try {
      const resp = await ml.mlInfo();
      const cloudId = resp.cloudId ?? null;
      setCloudInfo({
        isCloud: cloudId !== null,
        cloudId,
        deploymentId: cloudId === null ? null : extractDeploymentId(cloudId),
      });
    } catch (error) {
      setCloudInfo(null);
      // eslint-disable-next-line no-console
      console.error('Could not determine cloud information', error);
    }
  }, [unassignedJobCount]);

  useEffect(() => {
    checkCloudInfo();
  }, [unassignedJobCount]);

  useEffect(() => {
    checkNodes();
  }, [jobIds]);

  if (unassignedJobCount === 0) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.ml.jobsAwaitingNodeWarningShared.title"
            defaultMessage="Awaiting machine learning node"
          />
        }
        color="primary"
        iconType="iInCircle"
      >
        <div>
          <FormattedMessage
            id="xpack.ml.jobsAwaitingNodeWarningShared.noMLNodesAvailableDescription"
            defaultMessage="There {jobCount, plural, one {is} other {are}} {jobCount, plural, one {# job} other {# jobs}} waiting for machine learning nodes to start."
            values={{
              jobCount: unassignedJobCount,
            }}
          />
          <EuiSpacer size="s" />
          {cloudInfo &&
            (cloudInfo.isCloud ? (
              <>
                <FormattedMessage
                  id="xpack.ml.jobsAwaitingNodeWarningShared.isCloud"
                  defaultMessage="Elastic Cloud deployments can autoscale to add more ML capacity. This may take 5-20 minutes. "
                />
                {cloudInfo.deploymentId === null ? null : (
                  <FormattedMessage
                    id="xpack.ml.jobsAwaitingNodeWarningShared.isCloud.link"
                    defaultMessage="You can monitor progress in the {link}."
                    values={{
                      link: (
                        <EuiLink
                          href={`https://cloud.elastic.co/deployments?q=${cloudInfo.deploymentId}`}
                        >
                          <FormattedMessage
                            id="xpack.ml.jobsAwaitingNodeWarningShared.linkToCloud.linkText"
                            defaultMessage="Elastic Cloud admin console"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                )}
              </>
            ) : (
              <FormattedMessage
                id="xpack.ml.jobsAwaitingNodeWarningShared.notCloud"
                defaultMessage="Only Elastic Cloud deployments can autoscale; you must add machine learning nodes. {link}"
                values={{
                  link: (
                    <EuiLink
                      href={
                        'https://www.elastic.co/guide/en/elasticsearch/reference/master/modules-node.html#ml-node'
                      }
                    >
                      <FormattedMessage
                        id="xpack.ml.jobsAwaitingNodeWarningShared.linkToCloud.learnMore"
                        defaultMessage="Learn more."
                      />
                    </EuiLink>
                  ),
                }}
              />
            ))}
        </div>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default MLJobsAwaitingNodeWarning;
