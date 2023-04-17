/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiButton, EuiCallOut } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { RedirectAppLinks } from '@kbn/kibana-react-plugin/public';

import { KibanaLogic } from '../../../../shared/kibana';
import { AnalyticsCollectionDataViewLogic } from '../analytics_collection_data_view_logic';

export const AnalyticsCollectionExplorerCallout: React.FC = () => {
  const { application } = useValues(KibanaLogic);
  const { dataView } = useValues(AnalyticsCollectionDataViewLogic);
  const exploreLink =
    dataView &&
    application.getUrlForApp('discover', {
      path: `#/?_a=(index:'${dataView.id}')`,
    });

  return exploreLink ? (
    <EuiCallOut title="Need a deeper analysis?" iconType="inspect">
      <p>
        <FormattedMessage
          id="xpack.enterpriseSearch.analytics.collectionsView.explorer.callout.title"
          defaultMessage="Review your event logs in Discover to get more insights about your application metrics."
        />
      </p>

      <RedirectAppLinks application={application}>
        <EuiButton fill href={exploreLink}>
          <FormattedMessage
            id="xpack.enterpriseSearch.analytics.collectionsView.explorer.callout.button"
            defaultMessage="Explore"
          />
        </EuiButton>
      </RedirectAppLinks>
    </EuiCallOut>
  ) : null;
};
