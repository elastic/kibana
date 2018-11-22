/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { compose, withState, withProps } from 'recompose';
import { aeroelastic } from '../../lib/aeroelastic_kibana';
import { removeElements } from '../../state/actions/elements';
import { getFullscreen, canUserWrite } from '../../state/selectors/app';
import { getElements, isWriteable } from '../../state/selectors/workpad';
import { withEventHandlers } from './event_handlers';
import { WorkpadPage as Component } from './workpad_page';

const mapStateToProps = (state, ownProps) => {
  return {
    isEditable: !getFullscreen(state) && isWriteable(state) && canUserWrite(state),
    elements: getElements(state, ownProps.page.id),
  };
};

const mapDispatchToProps = dispatch => {
  return {
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
  withProps(({ updateCount, setUpdateCount, page, elements: pageElements, removeElements }) => {
    const { shapes, selectedLeafShapes = [], cursor } = aeroelastic.getStore(page.id).currentScene;
    const elementLookup = new Map(pageElements.map(element => [element.id, element]));
    const elements = shapes.map(
      shape =>
        elementLookup.has(shape.id)
          ? // instead of just combining `element` with `shape`, we make property transfer explicit
            { ...shape, filter: elementLookup.get(shape.id).filter }
          : shape
    );
    const selectedElements = selectedLeafShapes;
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
        if (selectedElements.length) removeElements(page.id)(selectedElements);
      },
    };
  }), // Updates states; needs to have both local and global
  withEventHandlers // Captures user intent, needs to have reconciled state
)(Component);

WorkpadPage.propTypes = {
  page: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
};
