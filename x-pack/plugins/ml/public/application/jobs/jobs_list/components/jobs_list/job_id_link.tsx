/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { useMlKibana, useMlUrlGenerator } from '../../../../contexts/kibana';
import { ML_PAGES } from '../../../../../../common/constants/ml_url_generator';
import { AnomalyDetectionQueryState } from '../../../../../../common/types/ml_url_generator';
// @ts-ignore
import { JobGroup } from '../job_group';

interface JobIdLink {
  id: string;
}

interface GroupIdLink {
  groupId: string;
  children: string;
}

type AnomalyDetectionJobIdLinkProps = JobIdLink | GroupIdLink;

function isGroupIdLink(props: JobIdLink | GroupIdLink): props is GroupIdLink {
  return (props as GroupIdLink).groupId !== undefined;
}
export const AnomalyDetectionJobIdLink = (props: AnomalyDetectionJobIdLinkProps) => {
  const mlUrlGenerator = useMlUrlGenerator();
  const {
    services: {
      application: { navigateToUrl },
    },
  } = useMlKibana();

  const redirectToJobsManagementPage = async () => {
    const pageState: AnomalyDetectionQueryState = {};
    if (isGroupIdLink(props)) {
      pageState.groupIds = [props.groupId];
    } else {
      pageState.jobId = props.id;
    }
    const url = await mlUrlGenerator.createUrl({
      page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
      pageState,
    });
    await navigateToUrl(url);
  };
  if (isGroupIdLink(props)) {
    return (
      <EuiLink key={props.groupId} onClick={() => redirectToJobsManagementPage()}>
        <JobGroup name={props.groupId} />
      </EuiLink>
    );
  } else {
    return (
      <EuiLink key={props.id} onClick={() => redirectToJobsManagementPage()}>
        {props.id}
      </EuiLink>
    );
  }
};
