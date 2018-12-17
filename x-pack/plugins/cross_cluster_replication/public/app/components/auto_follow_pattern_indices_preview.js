/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiCallOut } from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { getPreviewIndicesFromAutoFollowPattern } from '../services/auto_follow_pattern';

export const AutoFollowPatternIndicesPreview = injectI18n(({ prefix, suffix, leaderIndexPatterns, intl }) => {
  const { indicesPreview } = getPreviewIndicesFromAutoFollowPattern({
    prefix,
    suffix,
    leaderIndexPatterns
  });

  const title = intl.formatMessage({
    id: 'xpack.crossClusterReplication.autoFollowPatternForm.indicesPreviewTitle',
    defaultMessage: 'Index name examples',
  });

  return (
    <EuiCallOut
      title={title}
      iconType="indexMapping"
    >
      <FormattedMessage
        id="xpack.crossClusterReplication.autoFollowPatternForm.indicesPreviewDescription"
        defaultMessage="The above settings will generate index names that look like this:"
      />
      <ul>
        {indicesPreview.map(({ followPattern: { prefix, suffix, template } }, i) => (
          <li key={i}>
            {prefix}<strong>{template}</strong>{suffix}
          </li>
        ))}
      </ul>
    </EuiCallOut>
  );
});
