/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiImage, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import noResultsIllustrationDark from '../../../../assets/no_results_dark.svg';
import noResultsIllustrationLight from '../../../../assets/no_results_light.svg';

export function EmptyPrompt() {
  const { docLinks } = useApmPluginContext().core;

  return (
    <EuiEmptyPrompt
      body={
        <EuiText size="s">
          <FormattedMessage
            id="xpack.apm.infraTabs.emptyMessagePromptSupportedInfrastructureDescription"
            defaultMessage="Try modifying your filter and ensure the infrastructure your service runs on is {supportedLink}."
            values={{
              supportedLink: (
                <EuiLink
                  data-test-subj="apmInfraTabsEmptyPromptSupportedInfrastructureLink"
                  href={docLinks.links.apm.infrastructureTab}
                  target="_blank"
                >
                  {i18n.translate('xpack.apm.infraTabs.emptyMessagePromptSupportedLinkText', {
                    defaultMessage: 'supported',
                  })}
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      }
      color="subdued"
      data-test-subj="apmInfraTabsEmptyPrompt"
      icon={<NoResultsIllustration />}
      layout="horizontal"
      title={
        <h2>
          {i18n.translate('xpack.apm.infraTabs.emptyMessagePromptNoDataTitle', {
            defaultMessage: 'There is no data to display.',
          })}
        </h2>
      }
      titleSize="m"
    />
  );
}

function NoResultsIllustration() {
  const { colorMode } = useEuiTheme();

  const illustration =
    colorMode === 'DARK' ? noResultsIllustrationDark : noResultsIllustrationLight;

  return (
    <EuiImage alt={noResultsIllustrationAlternativeText} size="fullWidth" src={illustration} />
  );
}

const noResultsIllustrationAlternativeText = i18n.translate(
  'xpack.apm.infraTabs.emptyMessageIllustrationAlternativeText',
  { defaultMessage: 'A magnifying glass with an exclamation mark' }
);
