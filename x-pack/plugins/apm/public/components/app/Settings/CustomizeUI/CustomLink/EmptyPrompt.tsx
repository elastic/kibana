/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { CreateCustomLinkButton } from './CreateCustomLinkButton';

export const EmptyPrompt = ({
  onCreateCustomLinkClick,
}: {
  onCreateCustomLinkClick: () => void;
}) => {
  return (
    <EuiEmptyPrompt
      iconType="link"
      iconColor=""
      title={
        <h2>
          {i18n.translate(
            'xpack.apm.settings.customizeUI.customLink.emptyPromptTitle',
            {
              defaultMessage: 'No links found.',
            }
          )}
        </h2>
      }
      body={
        <>
          <p>
            {i18n.translate(
              'xpack.apm.settings.customizeUI.customLink.emptyPromptText',
              {
                defaultMessage:
                  "Let's change that! You can add custom links to the Actions context menu by the transaction details for each service. Create a helpful link to your company's support portal or open a new bug report. Learn more about it in our docs.",
              }
            )}
          </p>
        </>
      }
      actions={<CreateCustomLinkButton onClick={onCreateCustomLinkClick} />}
    />
  );
};
