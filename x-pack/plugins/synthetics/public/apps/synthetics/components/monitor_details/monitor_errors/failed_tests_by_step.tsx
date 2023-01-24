/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiProgress, EuiSpacer, EuiLoadingContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFailedTestByStep } from '../hooks/use_failed_tests_by_step';

export const FailedTestsByStep = ({ time }: { time: { to: string; from: string } }) => {
  const { failedSteps, loading } = useFailedTestByStep(time);

  if (loading && !failedSteps) {
    return <EuiLoadingContent lines={3} />;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <div>
        {failedSteps?.map((item) => (
          <Fragment key={item.name}>
            <EuiProgress
              valueText={
                <span>
                  {i18n.translate('xpack.synthetics.monitorDetails.summary.failedTests.count', {
                    defaultMessage: 'Failed {count}',
                    values: { count: item.count },
                  })}
                </span>
              }
              max={100}
              color="danger"
              size="l"
              value={item.percent}
              label={`${item.index}. ${item.name}`}
            />
            <EuiSpacer size="s" />
          </Fragment>
        ))}
      </div>
    </>
  );
};
