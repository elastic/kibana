/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiEmptyPrompt,
  EuiButton,
} from '@elastic/eui';

export const EmptyPrivileges = (props) => (
  <EuiEmptyPrompt
    title={<h3>No Kibana Privileges</h3>}
    body={
      <Fragment>
        <p>
          Assign privileges to allow this role to perform actions within Kibana.
        </p>
      </Fragment>
    }
    actions={
      <EuiButton size="s" color="primary" onClick={props.onClick}>Add Privileges</EuiButton>
    }
  />
);

EmptyPrivileges.propTypes = {
  onClick: PropTypes.func.isRequired,
};
