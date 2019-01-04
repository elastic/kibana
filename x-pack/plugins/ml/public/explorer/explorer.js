/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering Explorer dashboard swimlanes.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { injectI18n } from '@kbn/i18n/react';

import { LoadingIndicator } from '../components/loading_indicator/loading_indicator';

export const Explorer = injectI18n(
  class Explorer extends React.Component {
    static propTypes = {
      loading: PropTypes.bool
    }

    dummyMethod = () => { };

    render() {
      const { intl, loading } = this.props;
      return (
        <div>
          {loading && (
            <LoadingIndicator
              label={intl.formatMessage({
                id: 'xpack.ml.explorer.loadingLabel',
                defaultMessage: 'Loading',
              })}
            />
          )}
        </div>
      );
    }
  }
);
