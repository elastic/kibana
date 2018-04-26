/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiCode,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';
import { ChangesNeeded } from '../../blurbs';

export function ExplainExporters({ context, property, data }) {
  return (
    <Fragment>
      <ChangesNeeded />
      <EuiHorizontalRule size="half" />
      <EuiText className="noData__alignLeft">
        <p>
          We checked the <EuiCode>{context}</EuiCode> settings for{' '}
          <EuiCode>{property}</EuiCode>, and found the reason:{' '}
          <EuiCode>{data}</EuiCode>.
        </p>

        <p>
          Using monitoring exporters ship the monitoring data to a remote
          monitoring cluster is highly recommended as it keeps the integrity of
          the monitoring data safe no matter what the state of the production
          cluster. However, as this instance of Kibana could not find any
          monitoring data, there seems to be a problem with the{' '}
          <EuiCode>{property}</EuiCode> configuration, or the{' '}
          <EuiCode>xpack.monitoring.elasticsearch</EuiCode> settings in{' '}
          <EuiCode>kibana.yml</EuiCode>.
        </p>

        <p>
          Check that the intended exporters are enabled for sending statistics to
          the monitoring cluster, and that the monitoring cluster host matches the{' '}
          <EuiCode>xpack.monitoring.elasticsearch</EuiCode> setting in{' '}
          <EuiCode>kibana.yml</EuiCode> to see monitoring data in this instance of
          Kibana.
        </p>
      </EuiText>
    </Fragment>
  );
}

ExplainExporters.propTypes = {
  context: PropTypes.string.isRequired,
  property: PropTypes.string.isRequired,
  data: PropTypes.string.isRequired
};
