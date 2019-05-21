/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, omit } from 'lodash';
import { safeElementFromExpression } from '@kbn/interpreter/common';
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

// should we split `workpad.js` to eg. `workpad.js` (full) and `persistentWorkpadStructure.js` (persistent.workpad)?
// how can we better disambiguate the two? now both the entire state and `persistent.workpad` are informally called workpad
export function getFullWorkpadPersisted(state) {
  return {
    ...getWorkpad(state),
    assets: getAssets(state),
  };
}

export function getWorkpadPersisted(state) {
  return getWorkpad(state);
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

export function getElementCounts(state) {
  const resolvedArgs = get(state, 'transient.resolvedArgs');
  const results = {
    ready: 0,
    pending: 0,
    error: 0,
  };

  Object.keys(resolvedArgs).forEach(resolvedArg => {
    const arg = resolvedArgs[resolvedArg];
    const { expressionRenderable } = arg;

    if (!expressionRenderable) {
      results.pending++;
      return;
    }

    const { value, state } = expressionRenderable;

    if (value && value.as === 'error') {
      results.error++;
    } else if (state === 'ready') {
      results.ready++;
    } else {
      results.pending++;
    }
  });

  return results;
}

export function getElementStats(state) {
  return get(state, 'transient.elementStats');
}

export function getGlobalFilterExpression(state) {
  return getAllElements(state)
    .reduce((acc, el) => {
      // check that a filter is defined
      if (el.filter != null && el.filter.length) {
        return acc.concat(el.filter);
      }

      return acc;
    }, [])
    .join(' | ');
}

// element getters
export function getSelectedToplevelNodes(state) {
  return get(state, 'transient.selectedToplevelNodes', []);
}

export function getSelectedElementId(state) {
  const toplevelNodes = getSelectedToplevelNodes(state);
  return toplevelNodes.length === 1 ? toplevelNodes[0] : null;
}

export function getSelectedElement(state) {
  return getElementById(state, getSelectedElementId(state));
}

export function getElements(state, pageId, withAst = true) {
  const id = pageId || getSelectedPage(state);
  if (!id) {
    return [];
  }

  const page = getPageById(state, id);
  const elements = get(page, 'elements');

  if (!elements) {
    return [];
  }

  // explicitly strip the ast, basically a fix for corrupted workpads
  // due to https://github.com/elastic/kibana-canvas/issues/260
  // TODO: remove this once it's been in the wild a bit
  if (!withAst) {
    return elements.map(el => omit(el, ['ast']));
  }

  return elements.map(appendAst);
}

const augment = type => n => ({
  ...n,
  position: { ...n.position, type },
  ...(type === 'group' && { expression: 'shape fill="rgba(255,255,255,0)" | render' }), // fixme unify with mw/aeroelastic
});

const getNodesOfPage = page =>
  get(page, 'elements')
    .map(augment('element'))
    .concat((get(page, 'groups') || []).map(augment('group')));

export const getNodesForPage = (page, withAst) => {
  const elements = getNodesOfPage(page);

  if (!elements) {
    return [];
  }

  // explicitly strip the ast, basically a fix for corrupted workpads
  // due to https://github.com/elastic/kibana-canvas/issues/260
  // TODO: remove this once it's been in the wild a bit
  if (!withAst) {
    return elements.map(el => omit(el, ['ast']));
  }

  return elements.map(appendAst);
};

// todo unify or DRY up with `getElements`
export function getNodes(state, pageId, withAst = true) {
  const id = pageId || getSelectedPage(state);
  if (!id) {
    return [];
  }

  return getNodesForPage(getPageById(state, id), withAst);
}

export function getElementById(state, id, pageId) {
  // do we need to pass a truthy empty array instead of `true`?
  const element = getElements(state, pageId, []).find(el => el.id === id);
  if (element) {
    return appendAst(element);
  }
}

export function getNodeById(state, id, pageId) {
  // do we need to pass a truthy empty array instead of `true`?
  const group = getNodes(state, pageId, []).find(el => el.id === id);
  if (group) {
    return appendAst(group);
  }
}

export function getResolvedArgs(state, elementId, path) {
  if (!elementId) {
    return;
  }
  const args = get(state, ['transient', 'resolvedArgs', elementId]);
  if (path) {
    return get(args, path);
  }
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
