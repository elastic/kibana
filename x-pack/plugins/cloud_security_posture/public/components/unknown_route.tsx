/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { CspPageTemplate } from './page_template';

export const UnknownRoute = React.memo(() => (
  <CspPageTemplate template="centeredContent">
    <EuiEmptyPrompt
      data-test-subj="unknownRoute"
      iconColor="default"
      iconType="logoElastic"
      title={
        <p>
          <FormattedMessage id="xpack.csp.unknownRoute" defaultMessage="Page not found" />
        </p>
      }
    />
  </CspPageTemplate>
));
