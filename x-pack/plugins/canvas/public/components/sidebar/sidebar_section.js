/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useEuiTheme } from '@elastic/eui';
import { ClassNames } from '@emotion/react';
import { sidebarPanelClassName, sidebarPanelStylesFactory } from '../shared_styles';

export const SidebarSection = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <ClassNames>
      {({ css, cx }) => (
        <div className={cx(sidebarPanelClassName, css(sidebarPanelStylesFactory(euiTheme)))}>
          {children}
        </div>
      )}
    </ClassNames>
  );
};

SidebarSection.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string,
  tip: PropTypes.string,
};
