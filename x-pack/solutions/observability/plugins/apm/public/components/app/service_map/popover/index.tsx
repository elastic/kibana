/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover, useEuiTheme } from '@elastic/eui';
import type cytoscape from 'cytoscape';
import type { CSSProperties, MouseEvent } from 'react';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { enableDiagnosticMode } from '@kbn/observability-plugin/common';
import type { Environment } from '../../../../../common/environment_rt';
import { CytoscapeContext } from '../cytoscape';
import { getAnimationOptions } from '../cytoscape_options';
import { PopoverContent, getContentsComponent } from './popover_content';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

interface ContentsProps {
  elementData: cytoscape.NodeDataDefinition | cytoscape.ElementDataDefinition;
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  onFocusClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  onDiagnoseClick?: (state: boolean) => void;
}

interface PopoverProps {
  focusedServiceName?: string;
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
}

export type { ContentsProps, PopoverProps };

export function Popover({ focusedServiceName, environment, kuery, start, end }: PopoverProps) {
  const { euiTheme } = useEuiTheme();
  const cy = useContext(CytoscapeContext);
  const { core } = useApmPluginContext();
  const [selectedElement, setSelectedElement] = useState<
    cytoscape.NodeSingular | cytoscape.EdgeSingular | undefined
  >(undefined);
  const isDiagnosticModeEnabled = core.uiSettings.get(enableDiagnosticMode);

  const deselect = useCallback(() => {
    if (cy) {
      cy.elements().unselect();
    }
    setSelectedElement(undefined);
  }, [cy, setSelectedElement]);

  const renderedHeight = selectedElement?.renderedHeight() ?? 0;
  const renderedWidth = selectedElement?.renderedWidth() ?? 0;
  const box = selectedElement?.renderedBoundingBox({});

  const x = box ? box.x1 + box.w / 2 : -10000;
  const y = box ? box.y1 + box.h / 2 : -10000;

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
      cy.on('select', 'edge', selectHandler);
      cy.on('unselect', 'edge', deselect);
    }

    return () => {
      if (cy) {
        cy.removeListener('select', 'node', selectHandler);
        cy.removeListener('unselect', 'node', deselect);
        cy.removeListener('viewport', deselect);
        cy.removeListener('drag', 'node', deselect);
        cy.removeListener('select', 'edge', selectHandler);
        cy.removeListener('unselect', 'edge', deselect);
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
          ...getAnimationOptions(euiTheme),
          center: { eles: cy.getElementById(selectedElementId) },
        });
      }
    },
    [cy, selectedElementId, euiTheme]
  );

  const isAlreadyFocused = focusedServiceName === selectedElementId;

  const onFocusClick = isAlreadyFocused
    ? centerSelectedNode
    : (_event: MouseEvent<HTMLAnchorElement>) => deselect();

  // Check if we have a valid contents component for this element
  const hasContentsComponent = !!getContentsComponent(selectedElementData, isDiagnosticModeEnabled);

  const isOpen = !!selectedElement && hasContentsComponent;

  return (
    <div>
      <EuiPopover
        anchorPosition={'upCenter'}
        button={trigger}
        closePopover={() => {}}
        isOpen={isOpen}
        ref={popoverRef}
        style={popoverStyle}
        zIndex={1000}
      >
        {isOpen && (
          <PopoverContent
            elementData={{ ...selectedElementData, id: selectedElementId ?? '' }}
            elementId={selectedElementId ?? ''}
            environment={environment}
            kuery={kuery}
            start={start}
            end={end}
            onFocusClick={onFocusClick}
          />
        )}
      </EuiPopover>
    </div>
  );
}
