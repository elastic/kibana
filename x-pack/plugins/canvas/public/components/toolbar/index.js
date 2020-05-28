/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { pure, compose, withState, getContext, withHandlers } from 'recompose';
import { canUserWrite } from '../../state/selectors/app';

import {
  getWorkpad,
  getWorkpadName,
  getSelectedPageIndex,
  getSelectedElement,
  isWriteable,
} from '../../state/selectors/workpad';

import { Toolbar as Component } from './toolbar';

const mapStateToProps = (state) => ({
  workpadName: getWorkpadName(state),
  workpadId: getWorkpad(state).id,
  totalPages: getWorkpad(state).pages.length,
  selectedPageNumber: getSelectedPageIndex(state) + 1,
  selectedElement: getSelectedElement(state),
  isWriteable: isWriteable(state) && canUserWrite(state),
});

export const Toolbar = compose(
  pure,
  connect(mapStateToProps),
  getContext({
    router: PropTypes.object,
  }),
  withHandlers({
    nextPage: (props) => () => {
      const pageNumber = Math.min(props.selectedPageNumber + 1, props.totalPages);
      props.router.navigateTo('loadWorkpad', { id: props.workpadId, page: pageNumber });
    },
    previousPage: (props) => () => {
      const pageNumber = Math.max(1, props.selectedPageNumber - 1);
      props.router.navigateTo('loadWorkpad', { id: props.workpadId, page: pageNumber });
    },
  }),
  withState('tray', 'setTray', (props) => props.tray),
  withState('showWorkpadManager', 'setShowWorkpadManager', false)
)(Component);
