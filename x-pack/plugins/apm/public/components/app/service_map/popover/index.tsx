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
  EuiToolTip,
  EuiIcon,
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
import { i18n } from '@kbn/i18n';
import { SERVICE_NAME, SPAN_TYPE } from '../../../../../common/es_fields/apm';
import { Environment } from '../../../../../common/environment_rt';
import { useTheme } from '../../../../hooks/use_theme';
import { useTraceExplorerEnabledSetting } from '../../../../hooks/use_trace_explorer_enabled_setting';
import { CytoscapeContext } from '../cytoscape';
import { getAnimationOptions, popoverWidth } from '../cytoscape_options';
import { DependencyContents } from './dependency_contents';
import { EdgeContents } from './edge_contents';
import { ExternalsListContents } from './externals_list_contents';
import { ResourceContents } from './resource_contents';
import { ServiceContents } from './service_contents';

function getContentsComponent(
  selectedElementData:
    | cytoscape.NodeDataDefinition
    | cytoscape.EdgeDataDefinition,
  isTraceExplorerEnabled: boolean
) {
  if (
    selectedElementData.groupedConnections &&
    Array.isArray(selectedElementData.groupedConnections)
  ) {
    return ExternalsListContents;
  }
  if (selectedElementData[SERVICE_NAME]) {
    return ServiceContents;
  }
  if (selectedElementData[SPAN_TYPE] === 'resource') {
    return ResourceContents;
  }

  if (
    isTraceExplorerEnabled &&
    selectedElementData.source &&
    selectedElementData.target
  ) {
    return EdgeContents;
  }

  return DependencyContents;
}

export interface ContentsProps {
  elementData: cytoscape.NodeDataDefinition | cytoscape.ElementDataDefinition;
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
  const [selectedElement, setSelectedElement] = useState<
    cytoscape.NodeSingular | cytoscape.EdgeSingular | undefined
  >(undefined);
  const deselect = useCallback(() => {
    if (cy) {
      cy.elements().unselect();
    }
    setSelectedElement(undefined);
  }, [cy, setSelectedElement]);

  const isTraceExplorerEnabled = useTraceExplorerEnabledSetting();

  const renderedHeight = selectedElement?.renderedHeight() ?? 0;
  const renderedWidth = selectedElement?.renderedWidth() ?? 0;
  const box = selectedElement?.renderedBoundingBox({});

  const x = box ? box.x1 + box.w / 2 : -10000;
  const y = box ? box.y1 + box.h / 2 : -10000;

  const isOpen = !!selectedElement;
  const triggerStyle: CSSProperties = {
    background: 'transparent',
    height: renderedHeight,
    position: 'absolute',
    width: renderedWidth,
  };
  const trigger = <div style={triggerStyle} />;
  const zoom = cy?.zoom() ?? 1;
  const height = selectedElement?.height() ?? 0;
  const translateY = y - ((zoom + 1) * height) / 4;
  const popoverStyle: CSSProperties = {
    position: 'absolute',
    transform: `translate(${x}px, ${translateY}px)`,
  };
  const selectedElementData = selectedElement?.data() ?? {};
  const popoverRef = useRef<EuiPopover>(null);
  const selectedElementId = selectedElementData.id;

  // Set up Cytoscape event handlers
  useEffect(() => {
    const selectHandler: cytoscape.EventHandler = (event) => {
      setSelectedElement(event.target);
    };

    if (cy) {
      cy.on('select', 'node', selectHandler);
      cy.on('unselect', 'node', deselect);
      cy.on('viewport', deselect);
      cy.on('drag', 'node', deselect);
      if (isTraceExplorerEnabled) {
        cy.on('select', 'edge', selectHandler);
        cy.on('unselect', 'edge', deselect);
      }
    }

    return () => {
      if (cy) {
        cy.removeListener('select', 'node', selectHandler);
        cy.removeListener('unselect', 'node', deselect);
        cy.removeListener('viewport', undefined, deselect);
        cy.removeListener('drag', 'node', deselect);
        cy.removeListener('select', 'edge', selectHandler);
        cy.removeListener('unselect', 'edge', deselect);
      }
    };
  }, [cy, deselect, isTraceExplorerEnabled]);

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
          center: { eles: cy.getElementById(selectedElementId) },
        });
      }
    },
    [cy, selectedElementId, theme]
  );

  const isAlreadyFocused = focusedServiceName === selectedElementId;

  const onFocusClick = isAlreadyFocused
    ? centerSelectedNode
    : (_event: MouseEvent<HTMLAnchorElement>) => deselect();

  const ContentsComponent = getContentsComponent(
    selectedElementData,
    isTraceExplorerEnabled
  );

  return (
    <EuiPopover
      anchorPosition={'upCenter'}
      button={trigger}
      closePopover={() => {}}
      isOpen={isOpen}
      ref={popoverRef}
      style={popoverStyle}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        style={{ minWidth: popoverWidth }}
      >
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h3 style={{ wordBreak: 'break-all' }}>
              {selectedElementData.label ?? selectedElementId}
              {kuery && (
                <EuiToolTip
                  position="bottom"
                  content={i18n.translate(
                    'xpack.apm.serviceMap.kqlFilterInfo',
                    {
                      defaultMessage:
                        'The KQL filter is not applied in the displayed stats.',
                    }
                  )}
                >
                  <EuiIcon tabIndex={0} type="iInCircle" />
                </EuiToolTip>
              )}
            </h3>
          </EuiTitle>
          <EuiHorizontalRule margin="xs" />
        </EuiFlexItem>
        <ContentsComponent
          onFocusClick={onFocusClick}
          elementData={selectedElementData}
          environment={environment}
          kuery={kuery}
          start={start}
          end={end}
        />
      </EuiFlexGroup>
    </EuiPopover>
  );
}
