/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useProfilingDependencies } from '../../components/contexts/profiling_dependencies/use_profiling_dependencies';

interface Props {
  totalNumberOfDistinctProbabilisticValues: number;
}

export function DistinctProbabilisticValuesWarning({
  totalNumberOfDistinctProbabilisticValues,
}: Props) {
  const { docLinks } = useProfilingDependencies().start.core;

  return (
    <EuiCallOut
      title={i18n.translate(
        'xpack.profiling.storageExplorer.distinctProbabilisticProfilingValues.title',
        {
          defaultMessage:
            "We've identified {count} distinct probabilistic profiling values. Make sure to update them.",
          values: { count: totalNumberOfDistinctProbabilisticValues },
        }
      )}
      color="warning"
      iconType="warning"
    >
      <EuiText size="s" color="subdued">
        {i18n.translate(
          'xpack.profiling.storageExplorer.distinctProbabilisticProfilingValues.description',
          {
            defaultMessage:
              'We recommend using a consistent probabilistic value for each project for more efficient storage, cost management, and to maintain good statistical accuracy.',
          }
        )}
      </EuiText>
      <EuiSpacer />
      <EuiButton
        data-test-subj="profilingDistinctProbabilisticValuesWarningLearnHowButton"
        href={`${docLinks.ELASTIC_WEBSITE_URL}/guide/en/observability/${docLinks.DOC_LINK_VERSION}/profiling-probabilistic-profiling.html`}
        color="warning"
        target="_blank"
      >
        {i18n.translate(
          'xpack.profiling.storageExplorer.distinctProbabilisticProfilingValues.button',
          { defaultMessage: 'Learn how' }
        )}
      </EuiButton>
    </EuiCallOut>
  );
}
