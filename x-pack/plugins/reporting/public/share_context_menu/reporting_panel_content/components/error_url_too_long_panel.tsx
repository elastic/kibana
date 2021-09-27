/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiText } from '@elastic/eui';

interface Props {
  isUnsaved?: boolean;
}

const i18nTexts = {
  title: i18n.translate('xpack.reporting.panelContent.unsavedStateAndExceedsMaxLengthTitle', {
    defaultMessage: 'URL too long',
  }),
};

export const ErrorUrlTooLongPanel: FunctionComponent<Props> = ({ isUnsaved }) => (
  <EuiCallOut title={i18nTexts.title} size="s" iconType="alert" color="danger">
    <EuiText size="s">
      <p>
        {isUnsaved ? (
          <FormattedMessage
            id="xpack.reporting.panelContent.unsavedStateAndExceedsMaxLength"
            defaultMessage="This URL cannot be copied. Try saving your work."
          />
        ) : (
          // Reaching this state is essentially just an error and should result in a user contacting us.
          <FormattedMessage
            id="xpack.reporting.panelContent.unsavedStateAndExceedsMaxLength"
            defaultMessage="This URL cannot be copied."
          />
        )}
      </p>
    </EuiText>
  </EuiCallOut>
);
