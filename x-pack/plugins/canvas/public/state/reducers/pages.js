/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import immutable from 'object-path-immutable';
import { cloneSubgraphs } from '../../lib/clone_subgraphs';
import { getId } from '../../lib/get_id';
import { routerProvider } from '../../lib/router_provider';
import { getDefaultPage } from '../defaults';
import * as actions from '../actions/pages';
import { getSelectedPageIndex } from '../selectors/workpad';
import { isGroupId } from '../../components/workpad_page/positioning_utils';

const { set, del, insert } = immutable;

const setPageIndex = (workpadState, index) =>
  index < 0 || !workpadState.pages[index] || getSelectedPageIndex(workpadState) === index
    ? workpadState
    : set(workpadState, 'page', index);

function getPageIndexById(workpadState, id) {
  return workpadState.pages.findIndex((page) => page.id === id);
}

function addPage(workpadState, payload, srcIndex = workpadState.pages.length - 1) {
  return insert(workpadState, 'pages', payload || getDefaultPage(), srcIndex + 1);
}

function clonePage(page) {
  // TODO: would be nice if we could more reliably know which parameters need to get a unique id
  // this makes a pretty big assumption about the shape of the page object
  const elements = page.elements;
  const groups = page.groups || [];
  const nodes = elements.concat(groups);
  const newNodes = cloneSubgraphs(nodes);
  return {
    ...page,
    id: getId('page'),
    groups: newNodes.filter((n) => isGroupId(n.id)),
    elements: newNodes.filter((n) => !isGroupId(n.id)),
  };
}

export const pagesReducer = handleActions(
  {
    [actions.addPage]: (workpadState, { payload }) => {
      const { page: activePage } = workpadState;
      const withNewPage = addPage(workpadState, payload, activePage);
      const newState = setPageIndex(withNewPage, activePage + 1);

      // changes to the page require navigation
      const router = routerProvider();
      router.navigateTo('loadWorkpad', { id: newState.id, page: newState.page + 1 });

      return newState;
    },

    [actions.duplicatePage]: (workpadState, { payload }) => {
      const srcPage = workpadState.pages.find((page) => page.id === payload);

      // if the page id is invalid, don't change the state
      if (!srcPage) {
        return workpadState;
      }

      const srcIndex = workpadState.pages.indexOf(srcPage);
      const newPageIndex = srcIndex + 1;
      const insertedWorkpadState = addPage(workpadState, clonePage(srcPage), srcIndex);
      const newState = setPageIndex(insertedWorkpadState, newPageIndex);

      // changes to the page require navigation
      const router = routerProvider();
      router.navigateTo('loadWorkpad', { id: newState.id, page: newPageIndex + 1 });

      return newState;
    },

    [actions.setPage]: (workpadState, { payload }) => {
      return setPageIndex(workpadState, payload);
    },

    [actions.movePage]: (workpadState, { payload }) => {
      const { id, position } = payload;
      const pageIndex = getPageIndexById(workpadState, id);
      const newIndex = pageIndex + position;

      // TODO: do something better when given an invalid page id
      if (pageIndex < 0) {
        return workpadState;
      }

      // don't move pages past the first or last position
      if (newIndex < 0 || newIndex >= workpadState.pages.length) {
        return workpadState;
      }

      // remove and re-insert the page
      const page = { ...workpadState.pages[pageIndex] };
      let newState = insert(del(workpadState, `pages.${pageIndex}`), 'pages', page, newIndex);

      // adjust the selected page index and return the new state
      const selectedId = workpadState.pages[workpadState.page].id;
      const newSelectedIndex = newState.pages.findIndex((page) => page.id === selectedId);
      newState = set(newState, 'page', newSelectedIndex);

      // changes to the page require navigation
      const router = routerProvider();
      router.navigateTo('loadWorkpad', { id: newState.id, page: newState.page + 1 });

      return newState;
    },

    [actions.removePage]: (workpadState, { payload }) => {
      const curIndex = workpadState.page;
      const delIndex = getPageIndexById(workpadState, payload);
      if (delIndex >= 0) {
        let newState = del(workpadState, `pages.${delIndex}`);
        const router = routerProvider();
        const wasSelected = curIndex === delIndex;
        const wasOnlyPage = newState.pages.length === 0;
        const newSelectedPage = curIndex >= delIndex ? curIndex - 1 : curIndex;

        // if we removed the only page, create a new empty one
        if (wasOnlyPage) {
          newState = addPage(newState);
        }

        if (wasOnlyPage || wasSelected) {
          // if we removed the only page or the selected one, select the first one
          newState = set(newState, 'page', 0);
        } else {
          // set the adjusted selected page on new state
          newState = set(newState, 'page', newSelectedPage);
        }

        // changes to the page require navigation
        router.navigateTo('loadWorkpad', { id: newState.id, page: newState.page + 1 });

        return newState;
      }
    },

    [actions.stylePage]: (workpadState, { payload }) => {
      const pageIndex = workpadState.pages.findIndex((page) => page.id === payload.pageId);
      return set(workpadState, `pages.${pageIndex}.style`, payload.style);
    },

    [actions.setPageTransition]: (workpadState, { payload }) => {
      const pageIndex = workpadState.pages.findIndex((page) => page.id === payload.pageId);
      return set(workpadState, `pages.${pageIndex}.transition`, payload.transition);
    },
  },
  {}
);
