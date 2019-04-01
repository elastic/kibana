/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { DatePicker } from '../datepicker';
import {
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';
import { Breadcrumbs } from '../breadcrumbs';

const Header = ({ }) => {
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false}>
        <Breadcrumbs/>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DatePicker/>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export { Header };
