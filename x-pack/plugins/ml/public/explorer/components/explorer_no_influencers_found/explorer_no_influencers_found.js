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

export const ExplorerNoInfluencersFound = ({ swimlaneViewByFieldName, showFilterMessage = false }) => {
  let defaultMessage = 'No {swimlaneViewByFieldName} influencers found';
  if (showFilterMessage === true) {
    defaultMessage = '{swimlaneViewByFieldName} influencers not applicable for given filter';
  }

  return (
    <EuiEmptyPrompt
      iconType="alert"
      titleSize="xs"
      title={
        <h2>
          <FormattedMessage
            id="xpack.ml.explorer.noInfluencersFoundTitle"
            defaultMessage={defaultMessage}
            values={{ swimlaneViewByFieldName }}
          />
        </h2>
      }
    />);
};

ExplorerNoInfluencersFound.propTypes = {
  swimlaneViewByFieldName: PropTypes.string.isRequired,
  showFilterMessage: PropTypes.bool
};
