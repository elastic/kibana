/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';

export class UnsupportedSpacePrivilegesWarning extends Component<{}, {}> {
  public render() {
    return <EuiCallOut iconType="alert" color="warning" title={this.getMessage()} />;
  }

  private getMessage = () => {
    return (
      <FormattedMessage
        id="xpack.security.management.editRole.simplePrivilegeForm.unsupportedSpacePrivilegesWarning"
        defaultMessage="This role contains privilege definitions for spaces, but spaces are not enabled in Kibana. Saving this role will remove these privileges."
      />
    );
  };
}
