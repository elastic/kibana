/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { CreateCustomLinkButton } from './create_custom_link_button';

export function EmptyPrompt({
  onCreateCustomLinkClick,
}: {
  onCreateCustomLinkClick: () => void;
}) {
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
          <p>
            {i18n.translate('xpack.apm.settings.customLink.emptyPromptText', {
              defaultMessage:
                "Let's change that! You can add custom links to the Actions context menu by the transaction details for each service. Create a helpful link to your company's support portal or open a new bug report. Learn more about it in our docs.",
            })}
          </p>
        </>
      }
      actions={<CreateCustomLinkButton onClick={onCreateCustomLinkClick} />}
    />
  );
}
