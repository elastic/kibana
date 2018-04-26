/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiText,
  EuiCode,
} from '@elastic/eui';
import {
  ExplainCollectionEnabled,
  ExplainCollectionInterval,
  ExplainExporters,
  ExplainPluginEnabled
} from '../explanations';

const ExplainWhyNoData = ({ reason, ...props }) => {
  const { property, data, context } = reason;
  switch (property) {
    case 'xpack.monitoring.collection.enabled':
      return <ExplainCollectionEnabled {...reason} {...props} />;
    case 'xpack.monitoring.collection.interval':
      return <ExplainCollectionInterval {...reason} {...props} />;
    case 'xpack.monitoring.exporters':
      return <ExplainExporters {...reason} {...props} />;
    case 'xpack.monitoring.enabled':
      return <ExplainPluginEnabled {...reason} {...props} />;
    default:
      return (
        <EuiText>
          <p>
            There is a <EuiCode>{context}</EuiCode> setting that has{' '}
            <EuiCode>{property}</EuiCode> set to <EuiCode>{data}</EuiCode>.
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
  reason: PropTypes.object.isRequired
};
