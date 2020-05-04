/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { EuiText, EuiCode } from '@elastic/eui';
import {
  ExplainCollectionEnabled,
  ExplainCollectionInterval,
  ExplainExporters,
  ExplainExportersCloud,
  ExplainPluginEnabled,
} from '../explanations';
import { FormattedMessage } from '@kbn/i18n/react';

const ExplainWhyNoData = props => {
  const { reason } = props;
  const { property, data, context } = reason;
  switch (property) {
    case 'xpack.monitoring.collection.enabled':
      return <ExplainCollectionEnabled {...props} />;
    case 'xpack.monitoring.collection.interval':
      return <ExplainCollectionInterval {...props} />;
    case 'xpack.monitoring.exporters':
      return <ExplainExporters {...props} />;
    case 'xpack.monitoring.exporters.cloud_enabled':
      return <ExplainExportersCloud />;
    case 'xpack.monitoring.enabled':
      return <ExplainPluginEnabled {...props} />;
    case 'custom':
      return (
        <EuiText>
          <p>{reason.message}</p>
        </EuiText>
      );
    default:
      return (
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.noData.reasons.explainWhyNoDataDescription"
              defaultMessage="There is a {context} setting that has {property} set to {data}."
              values={{
                context: <EuiCode>{context}</EuiCode>,
                property: <EuiCode>{property}</EuiCode>,
                data: <EuiCode>{data}</EuiCode>,
              }}
            />
          </p>
        </EuiText>
      );
  }
};

export function ReasonFound(props) {
  return (
    <Fragment>
      <ExplainWhyNoData {...props} />
    </Fragment>
  );
}

ReasonFound.propTypes = {
  enabler: PropTypes.object.isRequired,
  reason: PropTypes.object.isRequired,
};
