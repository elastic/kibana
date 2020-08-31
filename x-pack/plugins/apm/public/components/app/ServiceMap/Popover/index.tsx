/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  CSSProperties,
  MouseEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { EuiPopover } from '@elastic/eui';
import cytoscape from 'cytoscape';
import { useTheme } from '../../../../hooks/useTheme';
import { SERVICE_NAME } from '../../../../../common/elasticsearch_fieldnames';
import { CytoscapeContext } from '../Cytoscape';
import { getAnimationOptions } from '../cytoscapeOptions';
import { Contents } from './Contents';

interface PopoverProps {
  focusedServiceName?: string;
}

export function Popover({ focusedServiceName }: PopoverProps) {
  const theme = useTheme();
  const cy = useContext(CytoscapeContext);
  const [selectedNode, setSelectedNode] = useState<
    cytoscape.NodeSingular | undefined
  >(undefined);
  const deselect = useCallback(() => {
    if (cy) {
      cy.elements().unselect();
    }
    setSelectedNode(undefined);
  }, [cy, setSelectedNode]);
  const renderedHeight = selectedNode?.renderedHeight() ?? 0;
  const renderedWidth = selectedNode?.renderedWidth() ?? 0;
  const { x, y } = selectedNode?.renderedPosition() ?? { x: -10000, y: -10000 };
  const isOpen = !!selectedNode;
  const isService = selectedNode?.data(SERVICE_NAME) !== undefined;
  const triggerStyle: CSSProperties = {
    background: 'transparent',
    height: renderedHeight,
    position: 'absolute',
    width: renderedWidth,
  };
  const trigger = <div style={triggerStyle} />;
  const zoom = cy?.zoom() ?? 1;
  const height = selectedNode?.height() ?? 0;
  const translateY = y - ((zoom + 1) * height) / 4;
  const popoverStyle: CSSProperties = {
    position: 'absolute',
    transform: `translate(${x}px, ${translateY}px)`,
  };
  const selectedNodeData = selectedNode?.data() ?? {};
  const selectedNodeServiceName = selectedNodeData.id;
  const label = selectedNodeData.label || selectedNodeServiceName;
  const popoverRef = useRef<EuiPopover>(null);

  // Set up Cytoscape event handlers
  useEffect(() => {
    const selectHandler: cytoscape.EventHandler = (event) => {
      setSelectedNode(event.target);
    };

    if (cy) {
      cy.on('select', 'node', selectHandler);
      cy.on('unselect', 'node', deselect);
      cy.on('data viewport', deselect);
    }

    return () => {
      if (cy) {
        cy.removeListener('select', 'node', selectHandler);
        cy.removeListener('unselect', 'node', deselect);
        cy.removeListener('data viewport', undefined, deselect);
      }
    };
  }, [cy, deselect]);

  // Handle positioning of popover. This makes it so the popover positions
  // itself correctly and the arrows are always pointing to where they should.
  useEffect(() => {
    if (popoverRef.current) {
      popoverRef.current.positionPopoverFluid();
    }
  }, [popoverRef, x, y]);

  const centerSelectedNode = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (cy) {
        cy.animate({
          ...getAnimationOptions(theme),
          center: { eles: cy.getElementById(selectedNodeServiceName) },
        });
      }
    },
    [cy, selectedNodeServiceName, theme]
  );

  const isAlreadyFocused = focusedServiceName === selectedNodeServiceName;

  const onFocusClick = isAlreadyFocused
    ? centerSelectedNode
    : (_event: MouseEvent<HTMLAnchorElement>) => deselect();

  return (
    <EuiPopover
      anchorPosition={'upCenter'}
      button={trigger}
      closePopover={() => {}}
      isOpen={isOpen}
      ref={popoverRef}
      style={popoverStyle}
    >
      <Contents
        isService={isService}
        label={label}
        onFocusClick={onFocusClick}
        selectedNodeData={selectedNodeData}
        selectedNodeServiceName={selectedNodeServiceName}
      />
    </EuiPopover>
  );
}
