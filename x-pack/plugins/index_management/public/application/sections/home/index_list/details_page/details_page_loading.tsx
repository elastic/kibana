/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

export const DetailsPageLoading = () => {
  return (
    <KibanaPageTemplate.EmptyPrompt
      title={<EuiLoadingSpinner size="xl" />}
      body={
        <EuiText color="subdued">
          <FormattedMessage
            id="xpack.idxMgmt.indexDetails.loadingDescription"
            defaultMessage="Loading index details…"
          />
        </EuiText>
      }
      data-test-subj="indexDetailsLoading"
    />
  );
};
