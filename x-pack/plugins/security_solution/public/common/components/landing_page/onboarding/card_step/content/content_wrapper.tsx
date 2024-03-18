/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import classnames from 'classnames';
import React from 'react';
import { useStepContentStyles } from '../../styles/step_content.styles';

const ContentWrapperComponent: React.FC<{ children: React.ReactElement; shadow?: boolean }> = ({
  children,
  shadow = true,
}) => {
  const { getRightContentStyles } = useStepContentStyles();
  const rightContentStyles = getRightContentStyles({ shadow });
  const rightPanelContentClassNames = classnames('right-panel-content', rightContentStyles);
  return <div className={rightPanelContentClassNames}>{children}</div>;
};

export const ContentWrapper = React.memo(ContentWrapperComponent);
