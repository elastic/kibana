/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { AddRoleAlert } from './add_role_alert';
import { AlertCallOut } from './alert_call_out';
import { EnableMonitoringAlert } from './enable_monitoring_alert';

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
