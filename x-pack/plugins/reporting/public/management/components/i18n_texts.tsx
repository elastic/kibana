/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';

export const i18nTexts = {
  cloud: {
    insufficientMemoryError: (helpUrl: string) => (
      <FormattedMessage
        id="xpack.reporting.listing.infoPanel.callout.cloud.insufficientMemoryError"
        defaultMessage="This report cannot be generated. {link}."
        values={{
          link: (
            <EuiLink href={helpUrl}>
              {i18n.translate(
                'xpack.reporting.listing.infoPanel.callout.cloud.insufficientMemoryError.urlLink',
                { defaultMessage: 'See minimum RAM requirements' }
              )}
            </EuiLink>
          ),
        }}
      />
    ),
  },
};
