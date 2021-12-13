/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { useMlManageJobsHref } from '../../../../hooks/use_ml_manage_jobs_href';

interface Props {
  children?: React.ReactNode;
  external?: boolean;
  jobId?: string;
}

export function MLManageJobsLink({ children, external, jobId }: Props) {
  const mlADLink = useMlManageJobsHref({
    jobId,
  });

  return (
    <EuiLink
      children={children}
      href={mlADLink}
      external={external}
      target={external ? '_blank' : undefined}
    />
  );
}
