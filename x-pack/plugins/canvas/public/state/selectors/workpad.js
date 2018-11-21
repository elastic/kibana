/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, omit } from 'lodash';
import { safeElementFromExpression } from '../../../common/lib/ast';
import { append } from '../../lib/modify_path';
import { getAssets } from './assets';

const workpadRoot = 'persistent.workpad';

const appendAst = element => ({
  ...element,
  ast: safeElementFromExpression(element.expression),
});

// workpad getters
export function getWorkpad(state) {
  return get(state, workpadRoot);
}

export function getWorkpadPersisted(state) {
  return {
    ...getWorkpad(state),
    assets: getAssets(state),
  };
}

export function getWorkpadInfo(state) {
  return omit(getWorkpad(state), ['pages']);
}

export function isWriteable(state) {
  return get(state, append(workpadRoot, 'isWriteable'), true);
}

// page getters
export function getSelectedPageIndex(state) {
  return get(state, append(workpadRoot, 'page'));
}

export function getSelectedPage(state) {
  const pageIndex = getSelectedPageIndex(state);
  const pages = getPages(state);
  return get(pages, `[${pageIndex}].id`);
}

export function getPages(state) {
  return get(state, append(workpadRoot, 'pages'), []);
}

export function getPageById(state, id) {
  const pages = getPages(state);
  return pages.find(page => page.id === id);
}

export function getPageIndexById(state, id) {
  const pages = getPages(state);
  return pages.findIndex(page => page.id === id);
}

export function getWorkpadName(state) {
  return get(state, append(workpadRoot, 'name'));
}

export function getWorkpadColors(state) {
  return get(state, append(workpadRoot, 'colors'));
}

export function getAllElements(state) {
  return getPages(state).reduce((elements, page) => elements.concat(page.elements), []);
}

export function getGlobalFilterExpression(state) {
  return getAllElements(state)
    .map(el => el.filter)
    .filter(str => str != null && str.length)
    .join(' | ');
}

// element getters
export function getSelectedElementId(state) {
  return get(state, 'transient.selectedElement');
}

export function getSelectedElement(state) {
  return getElementById(state, getSelectedElementId(state));
}

export function getElements(state, pageId, withAst = true) {
  const id = pageId || getSelectedPage(state);
  if (!id) return [];

  const page = getPageById(state, id);
  const elements = get(page, 'elements');

  if (!elements) return [];

  // explicitely strip the ast, basically a fix for corrupted workpads
  // due to https://github.com/elastic/kibana-canvas/issues/260
  // TODO: remove this once it's been in the wild a bit
  if (!withAst) return elements.map(el => omit(el, ['ast']));

  return elements.map(appendAst);
}

export function getElementById(state, id, pageId) {
  const element = getElements(state, pageId, []).find(el => el.id === id);
  if (element) return appendAst(element);
}

export function getResolvedArgs(state, elementId, path) {
  if (!elementId) return;
  const args = get(state, ['transient', 'resolvedArgs', elementId]);
  if (path) return get(args, path);
  return args;
}

export function getSelectedResolvedArgs(state, path) {
  return getResolvedArgs(state, getSelectedElementId(state), path);
}

export function getContextForIndex(state, index) {
  return getSelectedResolvedArgs(state, ['expressionContext', index - 1]);
}

export function getRefreshInterval(state) {
  return get(state, 'transient.refresh.interval', 0);
}
