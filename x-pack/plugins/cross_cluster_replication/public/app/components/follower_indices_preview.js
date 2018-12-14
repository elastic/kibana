/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { getPreviewIndicesFromAutoFollowPattern } from '../services/auto_follow_pattern';

const FollowerIndicesPreviewComponent = ({
  intl,
  prefix,
  suffix,
  leaderIndexPatterns,
}) => {
  const { indicesPreview } = getPreviewIndicesFromAutoFollowPattern({
    prefix,
    suffix,
    leaderIndexPatterns
  });

  const title = intl.formatMessage({
    id: 'xpack.crossClusterReplication.followerIndicesPreview.title',
    defaultMessage: 'Index name examples',
  });

  return (
    <EuiCallOut
      title={title}
      iconType="indexMapping"
    >
      <FormattedMessage
        id="xpack.crossClusterReplication.followerIndicesPreview.description"
        defaultMessage="The above settings will generate index names that look like this:"
      />
      <ul>
        {indicesPreview.map((followerIndex, i) => <li key={i}>{followerIndex}</li>)}
      </ul>
    </EuiCallOut>
  );
};

export const FollowerIndicesPreview = injectI18n(FollowerIndicesPreviewComponent);

