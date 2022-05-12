/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiTitle,
} from '@elastic/eui';
import cytoscape from 'cytoscape';
import React, {
  CSSProperties,
  MouseEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  SERVICE_NAME,
  SPAN_TYPE,
} from '../../../../../common/elasticsearch_fieldnames';
import { Environment } from '../../../../../common/environment_rt';
import { useTheme } from '../../../../hooks/use_theme';
import { CytoscapeContext } from '../cytoscape';
import { getAnimationOptions, popoverWidth } from '../cytoscape_options';
import { BackendContents } from './backend_contents';
import { ExternalsListContents } from './externals_list_contents';
import { ResourceContents } from './resource_contents';
import { ServiceContents } from './service_contents';

function getContentsComponent(selectedNodeData: cytoscape.NodeDataDefinition) {
  if (
    selectedNodeData.groupedConnections &&
    Array.isArray(selectedNodeData.groupedConnections)
  ) {
    return ExternalsListContents;
  }
  if (selectedNodeData[SERVICE_NAME]) {
    return ServiceContents;
  }
  if (selectedNodeData[SPAN_TYPE] === 'resource') {
    return ResourceContents;
  }

  return BackendContents;
}

export interface ContentsProps {
  nodeData: cytoscape.NodeDataDefinition;
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  onFocusClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}

interface PopoverProps {
  focusedServiceName?: string;
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
}

export function Popover({
  focusedServiceName,
  environment,
  kuery,
  start,
  end,
}: PopoverProps) {
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
  const popoverRef = useRef<EuiPopover>(null);
  const selectedNodeId = selectedNodeData.id;

  // Set up Cytoscape event handlers
  useEffect(() => {
    const selectHandler: cytoscape.EventHandler = (event) => {
      setSelectedNode(event.target);
    };

    if (cy) {
      cy.on('select', 'node', selectHandler);
      cy.on('unselect', 'node', deselect);
      cy.on('viewport', deselect);
      cy.on('drag', 'node', deselect);
    }

    return () => {
      if (cy) {
        cy.removeListener('select', 'node', selectHandler);
        cy.removeListener('unselect', 'node', deselect);
        cy.removeListener('viewport', undefined, deselect);
        cy.removeListener('drag', 'node', deselect);
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
          center: { eles: cy.getElementById(selectedNodeId) },
        });
      }
    },
    [cy, selectedNodeId, theme]
  );

  const isAlreadyFocused = focusedServiceName === selectedNodeId;

  const onFocusClick = isAlreadyFocused
    ? centerSelectedNode
    : (_event: MouseEvent<HTMLAnchorElement>) => deselect();

  const ContentsComponent = getContentsComponent(selectedNodeData);

  return (
    <EuiPopover
      anchorPosition={'upCenter'}
      button={trigger}
      closePopover={() => {}}
      isOpen={isOpen}
      ref={popoverRef}
      style={popoverStyle}
      initialFocus={false}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        style={{ minWidth: popoverWidth }}
      >
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h3 style={{ wordBreak: 'break-all' }}>
              {selectedNodeData.label ?? selectedNodeId}
            </h3>
          </EuiTitle>
          <EuiHorizontalRule margin="xs" />
        </EuiFlexItem>
        <ContentsComponent
          onFocusClick={onFocusClick}
          nodeData={selectedNodeData}
          environment={environment}
          kuery={kuery}
          start={start}
          end={end}
        />
      </EuiFlexGroup>
    </EuiPopover>
  );
}
