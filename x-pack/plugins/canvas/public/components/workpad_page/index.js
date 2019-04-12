/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import isEqual from 'react-fast-compare';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { branch, compose, shouldUpdate, withHandlers, withProps, withState } from 'recompose';
import { elementLayer, insertNodes, removeElements } from '../../state/actions/elements';
import { canUserWrite, getFullscreen } from '../../state/selectors/app';
import { getNodes, getPageById, isWriteable } from '../../state/selectors/workpad';
import { updater } from '../../lib/aeroelastic/layout';
import { createStore } from '../../lib/aeroelastic/store';
import { flatten, not } from '../../lib/aeroelastic/functional';
import { StaticPage } from '../workpad_static_page';
import { crawlTree, globalStateUpdater, shapesForNodes } from './integration_utils';
import { eventHandlers } from './event_handlers';
import { InteractiveWorkpadPage as InteractiveComponent } from './interactive_workpad_page';
import { selectToplevelNodes } from './../../state/actions/transient';

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

const animationProps = ({ isSelected, animation }) => {
  function getClassName() {
    if (animation) {
      return animation.name;
    }
    return isSelected ? 'canvasPage--isActive' : 'canvasPage--isInactive';
  }

  function getAnimationStyle() {
    if (!animation) {
      return {};
    }
    return {
      animationDirection: animation.direction,
      // TODO: Make this configurable
      animationDuration: '1s',
    };
  }

  return {
    className: getClassName(),
    animationStyle: getAnimationStyle(),
  };
};

const groupHandlerCreators = {
  groupNodes: ({ commit }) => () => commit('actionEvent', { event: 'group' }),
  ungroupNodes: ({ commit }) => () => commit('actionEvent', { event: 'ungroup' }),
};

const mapStateToProps = (state, ownProps) => {
  const selectedToplevelNodes = state.transient.selectedToplevelNodes;
  const nodes = getNodes(state, ownProps.pageId);
  const selectedPrimaryShapeObjects = selectedToplevelNodes
    .map(id => nodes.find(s => s.id === id))
    .filter(shape => shape);
  const selectedPersistentPrimaryNodes = flatten(
    selectedPrimaryShapeObjects.map(shape =>
      nodes.find(n => n.id === shape.id) // is it a leaf or a persisted group?
        ? [shape.id]
        : nodes.filter(s => s.parent === shape.id).map(s => s.id)
    )
  );
  const selectedNodeIds = flatten(selectedPersistentPrimaryNodes.map(crawlTree(nodes)));
  return {
    state,
    isEditable: !getFullscreen(state) && isWriteable(state) && canUserWrite(state),
    elements: nodes,
    selectedToplevelNodes,
    selectedNodes: selectedNodeIds.map(id => nodes.find(s => s.id === id)),
    pageStyle: getPageById(state, ownProps.pageId).style,
  };
};

const mapDispatchToProps = dispatch => ({
  dispatch,
  insertNodes: pageId => selectedNodes => dispatch(insertNodes(selectedNodes, pageId)),
  removeNodes: pageId => nodeIds => dispatch(removeElements(nodeIds, pageId)),
  selectToplevelNodes: nodes =>
    dispatch(selectToplevelNodes(nodes.filter(e => !e.position.parent).map(e => e.id))),
  // TODO: Abstract this out, this is similar to layering code in sidebar/index.js:
  elementLayer: (pageId, selectedElement, movement) => {
    dispatch(elementLayer({ pageId, elementId: selectedElement.id, movement }));
  },
});

const mergeProps = (
  { state, isEditable, elements, ...restStateProps },
  { dispatch, ...restDispatchProps },
  { isSelected, ...remainingOwnProps }
) =>
  isEditable && isSelected
    ? {
        elements,
        isInteractive: true,
        isSelected,
        ...remainingOwnProps,
        ...restDispatchProps,
        ...restStateProps,
        updateGlobalState: globalStateUpdater(dispatch, () => state),
      }
    : { elements, isSelected, isInteractive: false, ...remainingOwnProps };

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

const InteractivePage = compose(
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

export const WorkpadPage = compose(
  shouldUpdate(not(isEqual)), // this is critical, else random unrelated rerenders in the parent cause glitches here
  withProps(animationProps),
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
  ),
  branch(({ isInteractive }) => isInteractive, InteractivePage, StaticPage)
)();

WorkpadPage.propTypes = {
  pageId: PropTypes.string.isRequired,
};
