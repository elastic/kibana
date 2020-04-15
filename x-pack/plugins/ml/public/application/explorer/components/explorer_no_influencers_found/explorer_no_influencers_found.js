/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering EuiEmptyPrompt when no influencers were found.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiEmptyPrompt } from '@elastic/eui';

export const ExplorerNoInfluencersFound = ({
  viewBySwimlaneFieldName,
  showFilterMessage = false,
}) => (
  <EuiEmptyPrompt
    titleSize="xs"
    title={
      <h2>
        {showFilterMessage === false && (
          <FormattedMessage
            id="xpack.ml.explorer.noInfluencersFoundTitle"
            defaultMessage="No {viewBySwimlaneFieldName} influencers found"
            values={{ viewBySwimlaneFieldName }}
          />
        )}
        {showFilterMessage === true && (
          <FormattedMessage
            id="xpack.ml.explorer.noInfluencersFoundTitleFilterMessage"
            defaultMessage="No {viewBySwimlaneFieldName} influencers found for specified filter"
            values={{ viewBySwimlaneFieldName }}
          />
        )}
      </h2>
    }
  />
);

ExplorerNoInfluencersFound.propTypes = {
  viewBySwimlaneFieldName: PropTypes.string.isRequired,
  showFilterMessage: PropTypes.bool,
};
