/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiPanel, EuiToolTip } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import React, { useContext } from 'react';
import { CytoscapeContext } from '../../../context/cytoscape_context';

const ControlsContainer = euiStyled('div')`
  left: ${({ theme }) => theme.eui.euiSize};
  position: absolute;
  bottom: ${({ theme }) => theme.eui.euiSizeS};
  z-index: 1; /* The element containing the cytoscape canvas has z-index = 0. */
`;

const Button = euiStyled(EuiButtonIcon)`
  display: block;
  margin: ${({ theme }) => theme.eui.euiSizeXS};
`;

const Panel = euiStyled(EuiPanel)`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeS};
`;

export function ControlsBottom({ mapSize, setMapSize }) {
  const cy = useContext(CytoscapeContext);

  const isExpanded = mapSize === 'big';
  function expand() {
    setMapSize(isExpanded ? 'small' : 'big');
  }

  if (!cy) {
    return null;
  }

  return (
    <ControlsContainer>
      <Panel hasShadow={true} paddingSize="none">
        <EuiToolTip
          anchorClassName="eui-displayInline"
          content={isExpanded ? 'Shrink' : 'Grow'}
        >
          <Button
            aria-label={isExpanded ? 'Shrink' : 'Grow'}
            color="text"
            iconType={isExpanded ? 'minimize' : 'expand'}
            onClick={expand}
          />
        </EuiToolTip>
      </Panel>
    </ControlsContainer>
  );
}
