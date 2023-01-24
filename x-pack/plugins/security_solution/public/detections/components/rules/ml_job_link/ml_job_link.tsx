/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiLink } from '@elastic/eui';

import { ML_PAGES, useMlHref } from '@kbn/ml-plugin/public';
import { useKibana } from '../../../../common/lib/kibana';

const StyledJobEuiLInk = styled(EuiLink)`
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
`;

interface MlJobLinkProps {
  jobId: string;
}

const MlJobLinkComponent: React.FC<MlJobLinkProps> = ({ jobId }) => {
  const {
    services: { http, ml },
  } = useKibana();
  const jobUrl = useMlHref(ml, http.basePath.get(), {
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
    pageState: {
      jobId: [jobId],
    },
  });

  return (
    <StyledJobEuiLInk data-test-subj="machineLearningJobLink" href={jobUrl} target="_blank">
      <span data-test-subj="machineLearningJobId">{jobId}</span>
    </StyledJobEuiLInk>
  );
};

export const MlJobLink = memo(MlJobLinkComponent);
