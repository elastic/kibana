/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiCallOut, EuiCode } from '@elastic/eui';

function AddRoleAlert() {
  return (
    <p>
      <strong>Grant additional privileges. </strong>
      In Kibana Management, assign the <EuiCode>monitoring_user</EuiCode> role to your Kibana user.
    </p>
  );
}

function EnableMonitoringAlert() {
  return (
    <p>
      <strong>Enable monitoring. </strong>
      In the <EuiCode>kibana.yml</EuiCode> file, set
      <EuiCode>xpack.monitoring.enabled</EuiCode> and
      <EuiCode>xpack.monitoring.ui.enabled</EuiCode> to
      <EuiCode>true</EuiCode>.
    </p>
  );
}

function AlertCallOut(props) {
  return (
    <EuiCallOut
      title="Only pipelines created in Kibana Management appear here"
      color="warning"
      iconType="help"
    >
      <p>How can I see additional pipelines?</p>
      {props.children}
    </EuiCallOut>
  );
}

export function InfoAlerts({ showAddRoleAlert, showEnableMonitoringAlert }) {
  return showAddRoleAlert || showEnableMonitoringAlert ? (
    <AlertCallOut>
      {showAddRoleAlert && <AddRoleAlert />}
      {showEnableMonitoringAlert && <EnableMonitoringAlert />}
    </AlertCallOut>
  ) : null;
}

InfoAlerts.propTypes = {
  showAddRoleAlert: PropTypes.bool.isRequired,
  showEnableMonitoringAlert: PropTypes.bool.isRequired,
};
