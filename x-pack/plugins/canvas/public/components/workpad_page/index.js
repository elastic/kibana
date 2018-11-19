/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Storage } from 'ui/storage';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { compose, withState, withProps } from 'recompose';
import { getWindow } from '../../lib/get_window';
import { aeroelastic } from '../../lib/aeroelastic_kibana';
import { removeElements, duplicateElement } from '../../state/actions/elements';
import { getFullscreen, canUserWrite } from '../../state/selectors/app';
import { getElements, isWriteable } from '../../state/selectors/workpad';
import { LOCALSTORAGE_CLIPBOARD } from '../../../common/lib/constants';
import { withEventHandlers } from './event_handlers';
import { WorkpadPage as Component } from './workpad_page';

const storage = new Storage(getWindow().localStorage);

const mapStateToProps = (state, ownProps) => {
  return {
    isEditable: !getFullscreen(state) && isWriteable(state) && canUserWrite(state),
    elements: getElements(state, ownProps.page.id),
  };
};

const mapDispatchToProps = dispatch => {
  return {
    duplicateElement: pageId => selectedElement =>
      dispatch(duplicateElement(selectedElement, pageId)),
    removeElements: pageId => elementIds => dispatch(removeElements(elementIds, pageId)),
  };
};

const getRootElementId = (lookup, id) => {
  if (!lookup.has(id)) return null;

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
      if (animation) return animation.name;
      return isSelected ? 'canvasPage--isActive' : 'canvasPage--isInactive';
    }

    function getAnimationStyle() {
      if (!animation) return {};
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
      removeElements,
      duplicateElement,
    }) => {
      const { shapes, selectedLeafShapes = [], cursor } = aeroelastic.getStore(
        page.id
      ).currentScene;
      const elementLookup = new Map(pageElements.map(element => [element.id, element]));
      const selectedElementIds = selectedLeafShapes;
      const selectedElements = [];
      const elements = shapes.map(shape => {
        let element = null;
        if (elementLookup.has(shape.id)) {
          element = elementLookup.get(shape.id);
          if (selectedElementIds.indexOf(shape.id) > -1)
            selectedElements.push({ ...element, id: shape.id });
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
          if (selectedElementIds.length) removeElements(page.id)(selectedElementIds);
        },
        copyElements: () => {
          console.log('copy', JSON.stringify(selectedElements));
          if (selectedElements.length)
            storage.set(LOCALSTORAGE_CLIPBOARD, JSON.stringify(selectedElements));
        },
        cutElements: () => {
          console.log('cut', JSON.stringify(selectedElements));
          if (selectedElements.length) {
            storage.set(LOCALSTORAGE_CLIPBOARD, JSON.stringify(selectedElements));
            removeElements(page.id)(selectedElementIds);
          }
        },
        pasteElements: () => {
          const elements = JSON.parse(storage.get(LOCALSTORAGE_CLIPBOARD));
          if (elements) elements.map(element => duplicateElement(page.id)(element));
          console.log('paste', elements);
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
