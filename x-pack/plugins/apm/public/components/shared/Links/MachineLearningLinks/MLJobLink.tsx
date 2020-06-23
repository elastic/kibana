/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getMlJobId } from '../../../../../common/ml_job_constants';
import { MLLink } from './MLLink';

interface PropsServiceName {
  serviceName: string;
  transactionType?: string;
}
interface PropsJobId {
  jobId: string;
}

type Props = (PropsServiceName | PropsJobId) & {
  external?: boolean;
};

export const MLJobLink: React.FC<Props> = (props) => {
  const jobId =
    'jobId' in props
      ? props.jobId
      : getMlJobId(props.serviceName, props.transactionType);
  const query = {
    ml: { jobIds: [jobId] },
  };

  return (
    <MLLink
      children={props.children}
      query={query}
      path="/timeseriesexplorer"
      external={props.external}
    />
  );
};
