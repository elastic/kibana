/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { State, Store } from '../../../../types';
import { State as AeroState } from '../../../lib/aeroelastic';
import { createStore } from '../../../lib/aeroelastic/store';
// @ts-expect-error
import { updater } from '../../../lib/aeroelastic/layout';
import { getNodes } from '../../../state/selectors/workpad';
import { shapesForNodes } from '../integration_utils';

interface AeroStoreProps {
  pageId: string;
  height: number;
  width: number;
}

const configuration = {
  getAdHocChildAnnotationName: 'adHocChildAnnotation',
  adHocGroupName: 'adHocGroup',
  alignmentGuideName: 'alignmentGuide',
  atopZ: 1000,
  depthSelect: true,
  devColor: 'magenta',
  dragBoxAnnotationName: 'dragBoxAnnotation',
  dragBoxZ: 1050, // above alignment guides but below the upcoming hover tooltip
  groupName: 'group',
  groupResize: true,
  guideDistance: 3,
  hoverAnnotationName: 'hoverAnnotation',
  hoverLift: 100,
  intraGroupManipulation: false,
  intraGroupSnapOnly: false,
  minimumElementSize: 2,
  persistentGroupName: 'persistentGroup',
  resizeAnnotationConnectorOffset: 0,
  resizeAnnotationOffset: 0,
  resizeAnnotationOffsetZ: 0.1, // causes resize markers to be slightly above the shape plane
  resizeAnnotationSize: 10,
  resizeConnectorName: 'resizeConnector',
  resizeHandleName: 'resizeHandle',
  rotateAnnotationOffset: 12,
  rotateSnapInPixels: 10,
  rotationEpsilon: 0.001,
  rotationHandleName: 'rotationHandle',
  rotationHandleSize: 14,
  rotationTooltipName: 'rotationTooltip',
  shortcuts: false,
  singleSelect: false,
  snapConstraint: true,
  tooltipZ: 1100,
};

interface NewAeroStoreProps {
  height: number;
  width: number;
  shapes: ReturnType<typeof shapesForNodes>;
  selectedShapes: string[];
}

const getNewAeroStore = ({ height, width, shapes, selectedShapes }: NewAeroStoreProps) => {
  const state: AeroState = {
    currentScene: {
      shapes,
      configuration: { ...configuration, pageHeight: height, pageWidth: width },
      selectedShapes,
      selectedPrimaryShapes: selectedShapes,
      selectionState: { uid: 0, depthIndex: 0, down: false },
      gestureState: {
        cursor: { x: Infinity, y: Infinity },
        mouseIsDown: false,
        mouseButtonState: { buttonState: 'up', downX: null, downY: null },
      },
      gestureEnd: false,
    },
  };

  return createStore(state, updater);
};

export const useAeroStore = ({ pageId, height, width }: AeroStoreProps) => {
  const { state } = useSelector((storeState: State) => ({ state: storeState }));

  const [aeroStore] = useState<Store>(
    getNewAeroStore({
      height,
      width,
      shapes: shapesForNodes([]),
      selectedShapes: [],
    })
  );

  useEffect(() => {
    const nodes = getNodes(state, pageId);
    const selectedToplevelNodes = state.transient.selectedToplevelNodes;

    const shapes = shapesForNodes(nodes);
    const selectedShapes = selectedToplevelNodes.filter((e) => shapes.find((s) => s.id === e));

    const newState = {
      primaryUpdate: { type: 'init', payload: { uid: 0 } },
      currentScene: {
        shapes,
        configuration: { ...configuration, pageHeight: height, pageWidth: width },
        selectedShapes,
        selectedPrimaryShapes: selectedShapes,
        selectionState: aeroStore.getCurrentState().currentScene.selectionState,
        gestureState: aeroStore.getCurrentState().currentScene.gestureState,
        gestureEnd: false,
      },
    };

    aeroStore.setCurrentState(newState);
  }, [state, aeroStore, height, width, pageId]);

  return aeroStore;
};
