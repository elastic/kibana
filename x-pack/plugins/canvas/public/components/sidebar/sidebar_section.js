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
