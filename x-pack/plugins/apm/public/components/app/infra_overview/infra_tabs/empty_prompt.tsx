/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiEmptyPrompt,
  EuiImage,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import noResultsIllustrationDark from '../../../../assets/no_results_dark.svg';
import noResultsIllustrationLight from '../../../../assets/no_results_light.svg';
import { useTheme } from '../../../../hooks/use_theme';

export function EmptyPrompt() {
  return (
    <EuiEmptyPrompt
      body={
        <EuiDescriptionList compressed>
          <EuiDescriptionListTitle>
            {i18n.translate(
              'xpack.apm.infraTabs.emptyMessagePromptTimeRangeTitle',
              {
                defaultMessage: 'Expand your time range',
              }
            )}
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {i18n.translate(
              'xpack.apm.infraTabs.emptyMessagePromptDescription',
              {
                defaultMessage: 'Try searching over a longer period of time.',
              }
            )}
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      }
      color="subdued"
      data-test-subj="metricsTableEmptyIndicesContent"
      icon={<NoResultsIllustration />}
      layout="horizontal"
      title={
        <h2>
          {i18n.translate('xpack.apm.infraTabs.emptyMessagePromptTitle', {
            defaultMessage: 'No results match your search criteria.',
          })}
        </h2>
      }
      titleSize="m"
    />
  );
}

function NoResultsIllustration() {
  const theme = useTheme();

  const illustration = theme.darkMode
    ? noResultsIllustrationDark
    : noResultsIllustrationLight;

  return (
    <EuiImage
      alt={noResultsIllustrationAlternativeText}
      size="fullWidth"
      src={illustration}
    />
  );
}

const noResultsIllustrationAlternativeText = i18n.translate(
  'xpack.apm.infraTabs.emptyMessageIllustrationAlternativeText',
  { defaultMessage: 'A magnifying glass with an exclamation mark' }
);
