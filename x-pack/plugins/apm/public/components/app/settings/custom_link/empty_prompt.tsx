/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { CreateCustomLinkButton } from './create_custom_link_button';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

export function EmptyPrompt({
  onCreateCustomLinkClick,
}: {
  onCreateCustomLinkClick: () => void;
}) {
  const { docLinks } = useApmPluginContext().core;
  return (
    <EuiEmptyPrompt
      data-test-subj="customLinksEmptyPrompt"
      iconType="link"
      iconColor=""
      title={
        <h2>
          {i18n.translate('xpack.apm.settings.customLink.emptyPromptTitle', {
            defaultMessage: 'No links found.',
          })}
        </h2>
      }
      body={
        <>
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.apm.settings.customLink.emptyPromptText"
              defaultMessage="Let's change that! You can add custom links to the Actions context menu by the transaction details for each service. Create a helpful link to your company's support portal or open a new bug report. Need more ideas? See the {customLinkDocLinkText}."
              values={{
                customLinkDocLinkText: (
                  <EuiLink
                    target="_blank"
                    href={docLinks.links.apm.customLinks}
                  >
                    {i18n.translate(
                      'xpack.apm.settings.customLink.emptyPromptText.customLinkDocLinkText',
                      { defaultMessage: 'docs' }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </>
      }
      actions={<CreateCustomLinkButton onClick={onCreateCustomLinkClick} />}
    />
  );
}
