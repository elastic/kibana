/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withHandlers, withProps, withState } from 'recompose';
import { createStore } from '../../lib/aeroelastic/store';
import { updater } from '../../lib/aeroelastic/layout';
import { eventHandlers } from './event_handlers';
import { InteractiveWorkpadPage as InteractiveComponent } from './interactive_workpad_page';
import { shapesForNodes } from './integration_utils';

const configuration = {
  getAdHocChildAnnotationName: 'adHocChildAnnotation',
  adHocGroupName: 'adHocGroup',
  alignmentGuideName: 'alignmentGuide',
  atopZ: 1000,
  depthSelect: true,
  devColor: 'magenta',
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

const groupHandlerCreators = {
  groupNodes: ({ commit }) => () => commit('actionEvent', { event: 'group' }),
  ungroupNodes: ({ commit }) => () => commit('actionEvent', { event: 'ungroup' }),
};

const componentLayoutState = ({ aeroStore, setAeroStore, elements, selectedToplevelNodes }) => {
  const shapes = shapesForNodes(elements);
  const selectedShapes = selectedToplevelNodes.filter(e => shapes.find(s => s.id === e));
  const newState = {
    primaryUpdate: null,
    currentScene: {
      shapes,
      configuration,
      selectedShapes,
      selectionState: aeroStore
        ? aeroStore.getCurrentState().currentScene.selectionState
        : { uid: 0, depthIndex: 0, down: false },
      gestureState: aeroStore
        ? aeroStore.getCurrentState().currentScene.gestureState
        : {
            cursor: { x: 0, y: 0 },
            mouseIsDown: false,
            mouseButtonState: { buttonState: 'up', downX: null, downY: null },
          },
    },
  };
  if (aeroStore) {
    aeroStore.setCurrentState(newState);
  } else {
    setAeroStore((aeroStore = createStore(newState, updater)));
  }
  return { aeroStore };
};

export const InteractivePage = compose(
  withState('aeroStore', 'setAeroStore'),
  withProps(componentLayoutState),
  withProps(({ aeroStore, updateGlobalState }) => ({
    commit: (type, payload) => {
      const newLayoutState = aeroStore.commit(type, payload);
      if (newLayoutState.currentScene.gestureEnd) {
        updateGlobalState(newLayoutState);
      }
    },
  })),
  withState('canvasOrigin', 'saveCanvasOrigin'),
  withState('_forceRerender', 'forceRerender'),
  withProps(({ aeroStore }) => ({ cursor: aeroStore.getCurrentState().currentScene.cursor })),
  withProps(({ aeroStore, elements }) => {
    const elementLookup = new Map(elements.map(element => [element.id, element]));
    const elementsToRender = aeroStore.getCurrentState().currentScene.shapes.map(shape => {
      const element = elementLookup.get(shape.id);
      return element
        ? { ...shape, width: shape.a * 2, height: shape.b * 2, filter: element.filter }
        : shape;
    });
    return { elements: elementsToRender };
  }),
  withProps(({ commit, forceRerender }) => ({
    commit: (...args) => forceRerender(commit(...args)),
  })),
  withHandlers(groupHandlerCreators),
  withHandlers(eventHandlers), // Captures user intent, needs to have reconciled state
  () => InteractiveComponent
);
