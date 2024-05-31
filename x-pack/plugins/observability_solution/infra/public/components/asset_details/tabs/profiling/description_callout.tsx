/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';

const LOCAL_STORAGE_KEY = 'infra-profiling-description-callout-dismissed';

export function DescriptionCallout() {
  const [isDismissed, setIsDismissed] = useLocalStorage(LOCAL_STORAGE_KEY, false);

  const onDismissClick = useCallback(() => setIsDismissed(true), [setIsDismissed]);

  if (isDismissed) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.infra.profiling.descriptionCallout.title', {
          defaultMessage: 'Displaying Resource Consumption for this Host',
        })}
        iconType="iInCircle"
      >
        <EuiText>
          {i18n.translate('xpack.infra.profiling.descriptionCallout.body', {
            defaultMessage:
              'Universal Profiling helps you optimize resource usage and find performance bottlenecks by showing which lines of code are consuming resources on your host, down to the application code, kernel, and third-party libraries.',
          })}
        </EuiText>
        <EuiSpacer />
        <EuiFlexGroup alignItems="center">
          <EuiLink
            data-test-subj="infraProfilingDescriptionCalloutLearnMoreLink"
            href="https://www.elastic.co/guide/en/observability/current/profiling-get-started.html"
            external
            target="_blank"
          >
            {i18n.translate('xpack.infra.profiling.descriptionCallout.learnMore', {
              defaultMessage: 'Learn more',
            })}
          </EuiLink>
          <EuiButton data-test-subj="infraDescriptionCalloutDismissButton" onClick={onDismissClick}>
            {i18n.translate('xpack.infra.profiling.descriptionCallout.dismiss', {
              defaultMessage: 'Dismiss',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
}
