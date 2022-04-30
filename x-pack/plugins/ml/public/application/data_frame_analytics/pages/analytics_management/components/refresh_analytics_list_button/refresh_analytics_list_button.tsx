/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';

import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useRefreshAnalyticsList } from '../../../../common';

export const RefreshAnalyticsListButton: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { refresh } = useRefreshAnalyticsList({ isLoading: setIsLoading });
  return (
    <EuiButtonEmpty
      data-test-subj={`mlAnalyticsRefreshListButton${isLoading ? ' loading' : ' loaded'}`}
      onClick={refresh}
      isLoading={isLoading}
    >
      <FormattedMessage
        id="xpack.ml.dataframe.analyticsList.refreshButtonLabel"
        defaultMessage="Refresh"
      />
    </EuiButtonEmpty>
  );
};
