/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import isEqual from 'react-fast-compare';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { branch, compose, shouldUpdate, withProps } from 'recompose';
import { elementLayer, insertNodes, removeElements } from '../../state/actions/elements';
import { canUserWrite, getFullscreen } from '../../state/selectors/app';
import { getNodes, getPageById, isWriteable } from '../../state/selectors/workpad';
import { flatten, not } from '../../lib/aeroelastic/functional';
import { StaticPage } from '../workpad_static_page';
import { crawlTree, globalStateUpdater } from '../workpad_interactive_page/integration_utils';
import { InteractivePage } from '../workpad_interactive_page';
import { selectToplevelNodes } from './../../state/actions/transient';

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
