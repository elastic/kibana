/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const EmptyTreePlaceHolder = () => {
  return (
    <div className="prfDevTool__main__emptyTreePlaceholder">
      <EuiText color="subdued">
        {/* TODO: translations */}
        <h1>
          {i18n.translate('xpack.searchProfiler.emptyProfileTreeTitle', {
            defaultMessage: 'No queries to profile',
          })}
        </h1>
        <p>
          {i18n.translate('xpack.searchProfiler.emptyProfileTreeDescription', {
            defaultMessage: 'Enter a query, click Profile, and see the results here.',
          })}
        </p>
      </EuiText>
    </div>
  );
};
