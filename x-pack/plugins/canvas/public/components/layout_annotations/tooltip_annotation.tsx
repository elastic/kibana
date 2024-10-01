/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { useEuiMemoizedStyles } from '@elastic/eui';
// @ts-ignore Kibana does not have types for eui/lib
import { euiToolTipStyles } from '@elastic/eui/lib/components/tool_tip/tool_tip.styles';
import { matrixToCSS } from '../../lib/dom';
import { TransformMatrix3d } from '../../lib/aeroelastic';

interface Props {
  transformMatrix: TransformMatrix3d;
  text: string;
}

export const TooltipAnnotation: FC<Props> = ({ transformMatrix, text }) => {
  const newStyle = {
    transform: `${matrixToCSS(transformMatrix)} translate(1em, -1em)`,
  };
  const { euiToolTip } = useEuiMemoizedStyles(euiToolTipStyles);
  return (
    <div className="tooltipAnnotation canvasLayoutAnnotation" css={euiToolTip} style={newStyle}>
      <p>{text}°</p>
    </div>
  );
};

TooltipAnnotation.propTypes = {
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  text: PropTypes.string.isRequired,
};
