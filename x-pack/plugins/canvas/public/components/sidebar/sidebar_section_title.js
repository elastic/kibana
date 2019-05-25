/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiTitle, EuiFlexItem, EuiFlexGroup, EuiToolTip } from '@elastic/eui';

export const SidebarSectionTitle = ({ title, tip, children }) => {
  const formattedTitle = (
    <EuiTitle size="xxs">
      <h4>{title}</h4>
    </EuiTitle>
  );
  const renderTitle = () => {
    if (tip) {
      return (
        <EuiToolTip position="left" content={tip}>
          {formattedTitle}
        </EuiToolTip>
      );
    }

    return formattedTitle;
  };

  return (
    <EuiFlexGroup
      className="canvasSidebar__panelTitle"
      gutterSize="xs"
      alignItems="center"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem grow={false}>{renderTitle(tip)}</EuiFlexItem>
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

SidebarSectionTitle.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string,
  tip: PropTypes.string,
};
