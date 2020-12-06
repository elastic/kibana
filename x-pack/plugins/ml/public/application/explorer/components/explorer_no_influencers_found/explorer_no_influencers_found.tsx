/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';

/*
 * React component for rendering EuiEmptyPrompt when no influencers were found.
 */
export const ExplorerNoInfluencersFound: FC<{
  viewBySwimlaneFieldName: string;
  showFilterMessage?: boolean;
}> = ({ viewBySwimlaneFieldName, showFilterMessage = false }) =>
  showFilterMessage === false ? (
    <FormattedMessage
      id="xpack.ml.explorer.noInfluencersFoundTitle"
      defaultMessage="No {viewBySwimlaneFieldName} influencers found"
      values={{ viewBySwimlaneFieldName }}
    />
  ) : (
    <FormattedMessage
      id="xpack.ml.explorer.noInfluencersFoundTitleFilterMessage"
      defaultMessage="No {viewBySwimlaneFieldName} influencers found for specified filter"
      values={{ viewBySwimlaneFieldName }}
    />
  );
