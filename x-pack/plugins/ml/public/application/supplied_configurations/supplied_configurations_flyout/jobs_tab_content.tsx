/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { FC } from 'react';
import React from 'react';
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import type { Module, ModuleJob, ModuleDatafeed } from '../../../../common/types/modules';

interface Props {
  module: Module;
}

export const JobsTabContent: FC<Props> = ({ module }) => {
  const { euiTheme } = useEuiTheme();
  const jobConfigsWithDatafeeds = useMemo(
    () =>
      module.datafeeds.map(({ job_id: jobId, config }) => {
        const job = module.jobs.find((j) => j.id === jobId)!;
        return {
          ...job,
          config: { ...job.config, datafeed_config: config },
        } as ModuleJob & { datafeed_config: ModuleDatafeed['config'] };
      }),
    [module]
  );

  return (
    <>
      {jobConfigsWithDatafeeds.map((job) => {
        return (
          <>
            <EuiAccordion
              id={job.id}
              buttonContent={
                <EuiText size="m">
                  <p>{job.id}</p>
                </EuiText>
              }
              css={{ padding: `0 ${euiTheme.size.m}` }}
            >
              <EuiFlexGroup direction="column">
                <EuiSpacer size="s" />
                <EuiFlexItem>
                  <EuiText size="s" color="subdued">
                    <p>{job.config.description}</p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiCodeBlock
                    language="json"
                    isCopyable
                    overflowHeight="600px"
                    data-test-subj="mlPreconfigJobsQueryBlock"
                  >
                    {JSON.stringify(job.config, null, 2)}
                  </EuiCodeBlock>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiAccordion>
            <EuiSpacer size="l" />
          </>
        );
      })}
    </>
  );
};
