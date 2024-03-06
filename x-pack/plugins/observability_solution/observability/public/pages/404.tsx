/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut } from '@elastic/eui';
import { ObservabilityAppPageTemplate } from '../components/observability_app_page_template';

function PageNotFound() {
  return (
    <ObservabilityAppPageTemplate data-test-subj="pageNotFound">
      <EuiCallOut
        color="warning"
        iconType="iInCircle"
        title={
          <FormattedMessage
            id="xpack.observability.notFoundPage.title"
            defaultMessage="Page Not Found"
          />
        }
        data-test-subj={'observabilityPageNotFoundBanner'}
      >
        <p data-test-subj={'observabilityPageNotFoundBannerText'}>
          <FormattedMessage
            id="xpack.observability.notFoundPage.bannerText"
            defaultMessage="The Observability application doesn't recognize this route"
          />
        </p>
      </EuiCallOut>
    </ObservabilityAppPageTemplate>
  );
}

// eslint-disable-next-line import/no-default-export
export default PageNotFound;
