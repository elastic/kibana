/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut } from '@elastic/eui';
import { usePluginContext } from '../hooks/use_plugin_context';

function PageNotFound() {
  const { ObservabilityPageTemplate } = usePluginContext();

  return (
    <ObservabilityPageTemplate data-test-subj="pageNotFound">
      <EuiCallOut
        color="warning"
        iconType="iInCircle"
        title={
          <FormattedMessage id="xpack.slo.notFoundPage.title" defaultMessage="Page Not Found" />
        }
        data-test-subj={'observabilityPageNotFoundBanner'}
      >
        <p data-test-subj={'observabilityPageNotFoundBannerText'}>
          <FormattedMessage
            id="xpack.slo.notFoundPage.bannerText"
            defaultMessage="The Observability application doesn't recognize this route"
          />
        </p>
      </EuiCallOut>
    </ObservabilityPageTemplate>
  );
}

// eslint-disable-next-line import/no-default-export
export default PageNotFound;
