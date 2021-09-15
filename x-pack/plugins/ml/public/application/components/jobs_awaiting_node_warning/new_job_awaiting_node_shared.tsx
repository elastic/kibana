/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';

import { HttpHandler } from 'kibana/public';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  fetch: HttpHandler;
  jobCount?: number;
}

export const MLJobsAwaitingNodeWarning: FC<Props> = ({ fetch, jobCount }) => {
  const [showCallout, setShowCallout] = useState(false);

  useEffect(() => {
    fetch('/api/ml/ml_node_count')
      .then(({ lazyNodeCount }) => {
        if (lazyNodeCount > 0 && (jobCount === undefined || jobCount > 0)) {
          setShowCallout(true);
        }
      })
      .catch((error) => {
        setShowCallout(false);
        // eslint-disable-next-line no-console
        console.error('Could not determine ML node information');
      });
  }, [jobCount, fetch]);

  if (showCallout === false) {
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
          {jobCount === undefined ? (
            <FormattedMessage
              id="xpack.ml.jobsAwaitingNodeWarning.unknownJobCount.noMLNodesAvailableDescription"
              defaultMessage="Some jobs are waiting for machine learning nodes to start."
            />
          ) : (
            <FormattedMessage
              id="xpack.ml.jobsAwaitingNodeWarning.knownJobCount.noMLNodesAvailableDescription"
              defaultMessage="There {jobCount, plural, one {is} other {are}} {jobCount, plural, one {# job} other {# jobs}} waiting for machine learning nodes to start."
              values={{
                jobCount,
              }}
            />
          )}
        </div>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
