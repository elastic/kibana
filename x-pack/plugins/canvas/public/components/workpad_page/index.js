/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { compose, withState, withProps, withHandlers } from 'recompose';
import { aeroelastic } from '../../lib/aeroelastic_kibana';
import { removeElements, insertNodes, elementLayer } from '../../state/actions/elements';
import { getFullscreen, canUserWrite } from '../../state/selectors/app';
import { getNodes, isWriteable } from '../../state/selectors/workpad';
import { flatten } from '../../lib/aeroelastic/functional';
import { eventHandlers } from './event_handlers';
import { WorkpadPage as Component } from './workpad_page';
import { selectElement } from './../../state/actions/transient';

const mapStateToProps = (state, ownProps) => {
  return {
    isEditable: !getFullscreen(state) && isWriteable(state) && canUserWrite(state),
    elements: getNodes(state, ownProps.page.id),
  };
};

const mapDispatchToProps = dispatch => {
  return {
    insertNodes: pageId => selectedElements => dispatch(insertNodes(selectedElements, pageId)),
    removeElements: pageId => elementIds => dispatch(removeElements(elementIds, pageId)),
    selectElement: selectedElement => dispatch(selectElement(selectedElement)),
    // TODO: Abstract this out. This is the same code as in sidebar/index.js
    elementLayer: (pageId, selectedElement, movement) => {
      dispatch(
        elementLayer({
          pageId,
          elementId: selectedElement.id,
          movement,
        })
      );
    },
  };
};

// eslint-disable-next-line
const getRootElementId = (lookup, id) => {
  if (!lookup.has(id)) {
    return null;
  }

  const element = lookup.get(id);
  return element.parent && element.parent.subtype !== 'adHocGroup'
    ? getRootElementId(lookup, element.parent)
    : element.id;
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

const layoutProps = ({ forceUpdate, page, elements: pageElements }) => {
  const { shapes, selectedPrimaryShapes = [], cursor } = aeroelastic.getStore(page.id).currentScene;
  const elementLookup = new Map(pageElements.map(element => [element.id, element]));
  const recurseGroupTree = shapeId => {
    return [
      shapeId,
      ...flatten(
        shapes
          .filter(s => s.parent === shapeId && s.type !== 'annotation')
          .map(s => s.id)
          .map(recurseGroupTree)
      ),
    ];
  };

  const selectedPrimaryShapeObjects = selectedPrimaryShapes
    .map(id => shapes.find(s => s.id === id))
    .filter(shape => shape);

  const selectedPersistentPrimaryShapes = flatten(
    selectedPrimaryShapeObjects.map(shape =>
      shape.subtype === 'adHocGroup'
        ? shapes.filter(s => s.parent === shape.id && s.type !== 'annotation').map(s => s.id)
        : [shape.id]
    )
  );
  const selectedElementIds = flatten(selectedPersistentPrimaryShapes.map(recurseGroupTree));
  const selectedElements = [];
  const elements = shapes.map(shape => {
    let element = null;
    if (elementLookup.has(shape.id)) {
      element = elementLookup.get(shape.id);
      if (selectedElementIds.indexOf(shape.id) > -1) {
        selectedElements.push({ ...element, id: shape.id });
      }
    }
    // instead of just combining `element` with `shape`, we make property transfer explicit
    return element ? { ...shape, filter: element.filter } : shape;
  });
  return {
    elements,
    cursor,
    selectedElementIds,
    selectedElements,
    selectedPrimaryShapes,
    commit: (...args) => {
      aeroelastic.commit(page.id, ...args);
      forceUpdate();
    },
  };
};

const groupHandlerCreators = {
  groupElements: ({ commit }) => () =>
    commit('actionEvent', {
      event: 'group',
    }),
  ungroupElements: ({ commit }) => () =>
    commit('actionEvent', {
      event: 'ungroup',
    }),
};

export const WorkpadPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withProps(animationProps),
  withState('_forceUpdate', 'forceUpdate'), // TODO: phase out this solution
  withState('canvasOrigin', 'saveCanvasOrigin'),
  withProps(layoutProps), // Updates states; needs to have both local and global
  withHandlers(groupHandlerCreators),
  withHandlers(eventHandlers) // Captures user intent, needs to have reconciled state
)(Component);

WorkpadPage.propTypes = {
  page: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
};
