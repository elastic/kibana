/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { EuiPanel } from '@elastic/eui';

export const SidebarSection = ({ children }) => (
  <EuiPanel className="canvasSidebar__panel">{children}</EuiPanel>
);

SidebarSection.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string,
  tip: PropTypes.string,
};
