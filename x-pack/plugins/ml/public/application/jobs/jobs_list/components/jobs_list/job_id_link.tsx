/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { EuiLink } from '@elastic/eui';
import { useMlUrlGenerator } from '../../../../contexts/kibana';
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
  const [href, setHref] = useState<string>('');

  useEffect(() => {
    let isCancelled = false;
    const generateLink = async () => {
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
      if (!isCancelled) {
        setHref(url);
      }
    };
    generateLink();
    return () => {
      isCancelled = true;
    };
  }, [props, mlUrlGenerator]);

  if (isGroupIdLink(props)) {
    return (
      <EuiLink key={props.groupId} href={href}>
        <JobGroup name={props.groupId} />
      </EuiLink>
    );
  } else {
    return (
      <EuiLink key={props.id} href={href}>
        {props.id}
      </EuiLink>
    );
  }
};
