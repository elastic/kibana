/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { compose, withState, withProps, getContext, withHandlers } from 'recompose';
import { transitionsRegistry } from '../../lib/transitions_registry';
import { undoHistory, redoHistory } from '../../state/actions/history';
import { fetchAllRenderables } from '../../state/actions/elements';
import { getFullscreen } from '../../state/selectors/app';
import {
  getSelectedPageIndex,
  getAllElements,
  getWorkpad,
  getPages,
} from '../../state/selectors/workpad';
import { Workpad as Component } from './workpad';

const mapStateToProps = state => ({
  pages: getPages(state),
  selectedPageNumber: getSelectedPageIndex(state) + 1,
  totalElementCount: getAllElements(state).length,
  workpad: getWorkpad(state),
  isFullscreen: getFullscreen(state),
});

const mapDispatchToProps = {
  undoHistory,
  redoHistory,
  fetchAllRenderables,
};

export const Workpad = compose(
  getContext({
    router: PropTypes.object,
  }),
  withState('grid', 'setGrid', false),
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withState('transition', 'setTransition', null),
  withState('prevSelectedPageNumber', 'setPrevSelectedPageNumber', 0),
  withProps(({ selectedPageNumber, prevSelectedPageNumber, transition }) => {
    function getAnimation(pageNumber) {
      if (!transition || !transition.name) return null;
      if (![selectedPageNumber, prevSelectedPageNumber].includes(pageNumber)) return null;
      const { enter, exit } = transitionsRegistry.get(transition.name);
      const laterPageNumber = Math.max(selectedPageNumber, prevSelectedPageNumber);
      const name = pageNumber === laterPageNumber ? enter : exit;
      const direction = prevSelectedPageNumber > selectedPageNumber ? 'reverse' : 'normal';
      return { name, direction };
    }

    return { getAnimation };
  }),
  withHandlers({
    onPageChange: props => pageNumber => {
      if (pageNumber === props.selectedPageNumber) return;
      props.setPrevSelectedPageNumber(props.selectedPageNumber);
      const transitionPage = Math.max(props.selectedPageNumber, pageNumber) - 1;
      const { transition } = props.workpad.pages[transitionPage];
      if (transition) props.setTransition(transition);
      props.router.navigateTo('loadWorkpad', { id: props.workpad.id, page: pageNumber });
    },
  }),
  withHandlers({
    onTransitionEnd: ({ setTransition }) => () => setTransition(null),
    nextPage: props => () => {
      const pageNumber = Math.min(props.selectedPageNumber + 1, props.workpad.pages.length);
      props.onPageChange(pageNumber);
    },
    previousPage: props => () => {
      const pageNumber = Math.max(1, props.selectedPageNumber - 1);
      props.onPageChange(pageNumber);
    },
  })
)(Component);
