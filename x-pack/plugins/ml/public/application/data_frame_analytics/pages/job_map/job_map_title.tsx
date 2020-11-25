/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const JobMapTitle: FC<{ analyticsId?: string; modelId?: string }> = ({
  analyticsId,
  modelId,
}) => (
  <EuiTitle size="xs">
    <span>
      {analyticsId
        ? i18n.translate('xpack.ml.dataframe.analyticsMap.analyticsIdTitle', {
            defaultMessage: 'Map for analytics ID {analyticsId}',
            values: { analyticsId },
          })
        : i18n.translate('xpack.ml.dataframe.analyticsMap.modelIdTitle', {
            defaultMessage: 'Map for trained model ID {modelId}',
            values: { modelId },
          })}
    </span>
  </EuiTitle>
);
