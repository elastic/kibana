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

export function ExplainPluginEnabled({ context, property, data }) {
  return (
    <Fragment>
      <ChangesNeeded />
      <EuiHorizontalRule size="half" />
      <EuiText>
        <p>
          We checked the {context} settings and found that <EuiCode>{property}</EuiCode>{' '}
          is set to <EuiCode>{data}</EuiCode> set, which disables monitoring.
          Removing the <EuiCode>xpack.monitoring.enabled: false</EuiCode> setting
          from your configuration will put the default into effect and enable Monitoring.
        </p>
      </EuiText>
    </Fragment>
  );
}

ExplainPluginEnabled.propTypes = {
  property: PropTypes.string.isRequired,
  context: PropTypes.string.isRequired,
  data: PropTypes.string.isRequired
};
