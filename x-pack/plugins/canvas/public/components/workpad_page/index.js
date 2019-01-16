/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { compose, withState, withProps } from 'recompose';
import { notify } from '../../lib/notify';
import { aeroelastic } from '../../lib/aeroelastic_kibana';
import { setClipboardData, getClipboardData } from '../../lib/clipboard';
import { cloneSubgraphs } from '../../lib/clone_subgraphs';
import { removeElements, insertNodes } from '../../state/actions/elements';
import { getFullscreen, canUserWrite } from '../../state/selectors/app';
import { getNodes, isWriteable } from '../../state/selectors/workpad';
import { flatten } from '../../lib/aeroelastic/functional';
import { withEventHandlers } from './event_handlers';
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
  };
};

const getRootElementId = (lookup, id) => {
  if (!lookup.has(id)) {
    return null;
  }

  const element = lookup.get(id);
  return element.parent && element.parent.subtype !== 'adHocGroup'
    ? getRootElementId(lookup, element.parent)
    : element.id;
};

export const WorkpadPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withProps(({ isSelected, animation }) => {
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
  }),
  withState('updateCount', 'setUpdateCount', 0), // TODO: remove this, see setUpdateCount below
  withProps(
    ({
      updateCount,
      setUpdateCount,
      page,
      elements: pageElements,
      insertNodes,
      removeElements,
      selectElement,
    }) => {
      const { shapes, selectedPrimaryShapes = [], cursor } = aeroelastic.getStore(
        page.id
      ).currentScene;
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
      const selectedPrimaryShapeObjects = selectedPrimaryShapes.map(id =>
        shapes.find(s => s.id === id)
      );
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
        commit: (...args) => {
          aeroelastic.commit(page.id, ...args);
          // TODO: remove this, it's a hack to force react to rerender
          setUpdateCount(updateCount + 1);
        },
        remove: () => {
          // currently, handle the removal of one element, exploiting multiselect subsequently
          if (selectedElementIds.length) {
            removeElements(page.id)(selectedElementIds);
          }
        },
        copyElements: () => {
          if (selectedElements.length) {
            setClipboardData({ selectedElements, rootShapes: selectedPrimaryShapes });
            notify.success('Copied element to clipboard');
          }
        },
        cutElements: () => {
          if (selectedElements.length) {
            setClipboardData({ selectedElements, rootShapes: selectedPrimaryShapes });
            removeElements(page.id)(selectedElementIds);
            notify.success('Copied element to clipboard');
          }
        },
        pasteElements: () => {
          const { selectedElements, rootShapes } = JSON.parse(getClipboardData()) || {};
          const clonedElements = selectedElements && cloneSubgraphs(selectedElements);
          if (clonedElements) {
            // first clone and persist the new node(s)
            insertNodes(page.id)(clonedElements);
            // then select the cloned node
            if (rootShapes.length) {
              if (selectedElements.length > 1) {
                // adHocGroup branch (currently, pasting will leave only the 1st element selected, rather than forming a
                // new adHocGroup - todo)
                selectElement(clonedElements[0].id);
              } else {
                // single element or single persistentGroup branch
                selectElement(
                  clonedElements[selectedElements.findIndex(s => s.id === rootShapes[0])].id
                );
              }
            }
          }
        },
      };
    }
  ), // Updates states; needs to have both local and global
  withEventHandlers // Captures user intent, needs to have reconciled state
)(Component);

WorkpadPage.propTypes = {
  page: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
};
