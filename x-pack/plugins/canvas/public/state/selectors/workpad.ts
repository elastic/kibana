/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, omit } from 'lodash';
import { safeElementFromExpression, fromExpression } from '@kbn/interpreter';
import { CanvasRenderedWorkpad } from '../../../shareable_runtime/types';
import { append } from '../../lib/modify_path';
import { getAssets } from './assets';
import {
  State,
  CanvasWorkpad,
  CanvasPage,
  CanvasElement,
  CanvasVariable,
  ResolvedArgType,
} from '../../../types';
import {
  ExpressionContext,
  CanvasGroup,
  PositionedElement,
  CanvasWorkpadBoundingBox,
  ExpressionAstArgument,
  ExpressionAstFunction,
  ExpressionAstExpression,
} from '../../../types';
import { isExpressionWithFilters } from '../../lib/filter';

type Modify<T, R> = Pick<T, Exclude<keyof T, keyof R>> & R;
type WorkpadInfo = Modify<CanvasWorkpad, { pages: undefined }>;

const workpadRoot = 'persistent.workpad';

const appendAst = (element: CanvasElement): PositionedElement => ({
  ...element,
  ast: safeElementFromExpression(element.expression) as ExpressionAstExpression,
});

// workpad getters
export function getWorkpad(state: State): State['persistent']['workpad'] {
  return get(state, workpadRoot);
}

// should we split `workpad.js` to eg. `workpad.js` (full) and `persistentWorkpadStructure.js` (persistent.workpad)?
// how can we better disambiguate the two? now both the entire state and `persistent.workpad` are informally called workpad
export function getFullWorkpadPersisted(state: State) {
  return {
    ...getWorkpad(state),
    assets: getAssets(state),
  };
}

export function getWorkpadPersisted(state: State) {
  return getWorkpad(state);
}

export function getWorkpadVariables(state: State) {
  const workpad = getWorkpad(state);
  return get(workpad, 'variables', []);
}

export function getWorkpadVariablesAsObject(state: State) {
  const variables = getWorkpadVariables(state);
  if (variables.length === 0) {
    return {};
  }

  return (variables as CanvasVariable[]).reduce(
    (vars: Record<string, any>, v: CanvasVariable) => ({ ...vars, [v.name]: v.value }),
    {}
  );
}

export function getWorkpadInfo(state: State): WorkpadInfo {
  return {
    ...getWorkpad(state),
    pages: undefined,
  };
}

export function isWriteable(state: State): boolean {
  return get(state, append(workpadRoot, 'isWriteable'), true);
}

// page getters
export function getSelectedPageIndex(state: State): number {
  return get(state, append(workpadRoot, 'page'));
}

export function getSelectedPage(state: State): string {
  const pageIndex = getSelectedPageIndex(state);
  const pages = getPages(state);
  return get(pages, `[${pageIndex}].id`);
}

export function getPages(state: State): State['persistent']['workpad']['pages'] {
  return get(state, append(workpadRoot, 'pages'), []);
}

export function getPageById(state: State, id: string): CanvasPage | undefined {
  const pages = getPages(state);
  return pages.find((page) => page.id === id);
}

export function getPageIndexById(state: State, id: string): number {
  const pages = getPages(state);
  return pages.findIndex((page) => page.id === id);
}

export function getWorkpadName(state: State): string {
  return get(state, append(workpadRoot, 'name'));
}

export function getWorkpadHeight(state: State): number {
  return get(state, append(workpadRoot, 'height'));
}

export function getWorkpadWidth(state: State): number {
  return get(state, append(workpadRoot, 'width'));
}

export function getWorkpadBoundingBox(state: State): CanvasWorkpadBoundingBox {
  return getPages(state).reduce(
    (boundingBox, page) => {
      page.elements.forEach(({ position }) => {
        const { left, top, width, height } = position;
        const right = left + width;
        const bottom = top + height;

        if (left < boundingBox.left) {
          boundingBox.left = left;
        }
        if (top < boundingBox.top) {
          boundingBox.top = top;
        }
        if (right > boundingBox.right) {
          boundingBox.right = right;
        }

        if (bottom > boundingBox.bottom) {
          boundingBox.bottom = bottom;
        }
      });

      return boundingBox;
    },
    {
      left: 0,
      right: getWorkpadWidth(state),
      top: 0,
      bottom: getWorkpadHeight(state),
    }
  );
}

export function getWorkpadColors(state: State): string[] {
  return get(state, append(workpadRoot, 'colors'));
}

export function getAllElements(state: State): CanvasElement[] {
  return getPages(state).reduce<CanvasElement[]>(
    (elements, page) => elements.concat(page.elements),
    []
  );
}

export function getElementCounts(state: State) {
  const resolvedArgs = state.transient.resolvedArgs;
  const results = {
    ready: 0,
    pending: 0,
    error: 0,
  };

  Object.values(resolvedArgs)
    .filter(
      (maybeResolvedArg): maybeResolvedArg is ResolvedArgType => maybeResolvedArg !== undefined
    )
    .forEach((resolvedArg) => {
      const { expressionRenderable } = resolvedArg;

      if (!expressionRenderable) {
        results.pending++;
        return;
      }

      const { value, state: readyState } = expressionRenderable;

      if (value && value.as === 'error') {
        results.error++;
      } else if (readyState === 'ready') {
        results.ready++;
      } else {
        results.pending++;
      }
    });

  return results;
}

export function getElementStats(state: State): State['transient']['elementStats'] {
  return get(state, 'transient.elementStats');
}

export function getGlobalFilters(state: State): string[] {
  return getAllElements(state).reduce<string[]>((acc, el) => {
    // check that a filter is defined
    if (el.filter != null && el.filter.length) {
      return acc.concat(el.filter);
    }

    return acc;
  }, []);
}

type OnValueFunction = (
  argValue: ExpressionAstArgument,
  argNames?: string,
  args?: ExpressionAstFunction['arguments']
) => ExpressionAstArgument | ExpressionAstArgument[] | undefined;

function buildGroupValues(args: ExpressionAstFunction['arguments'], onValue: OnValueFunction) {
  const argNames = Object.keys(args);

  return argNames.reduce<ExpressionAstArgument[]>((values, argName) => {
    // we only care about group values
    if (argName !== '_' && argName !== 'group') {
      return values;
    }

    return args[argName].reduce<ExpressionAstArgument[]>((acc, argValue) => {
      // delegate to passed function to buyld list
      return acc.concat(onValue(argValue, argName, args) || []);
    }, values);
  }, []);
}

function extractFilterGroups(
  ast: ExpressionAstExpression | ExpressionAstFunction
): ExpressionAstArgument[] {
  if (ast.type !== 'expression') {
    throw new Error('AST must be an expression');
  }

  return ast.chain.reduce<ExpressionAstArgument[]>((groups, item) => {
    // TODO: we always get a function here, right?
    const { function: fn, arguments: args } = item;

    if (isExpressionWithFilters(fn)) {
      // we have a filter function, extract groups from args
      return groups.concat(
        buildGroupValues(args, (argValue) => {
          // this only handles simple values
          if (argValue !== null && typeof argValue !== 'object') {
            return argValue;
          }
        })
      );
    } else {
      // dig into other functions, looking for filters function
      return groups.concat(
        buildGroupValues(args, (argValue) => {
          // recursively collect filter groups
          if (argValue !== null && typeof argValue === 'object' && argValue.type === 'expression') {
            return extractFilterGroups(argValue);
          }
        })
      );
    }
  }, []);
}

export function getGlobalFilterGroups(state: State) {
  const filterGroups = getAllElements(state).reduce<string[]>((acc, el) => {
    // check that a filter is defined
    if (el.filter != null && el.filter.length) {
      // extract the filter group
      const filterAst = fromExpression(el.filter) as ExpressionAstExpression;
      const filterGroup: ExpressionAstArgument = get(
        filterAst,
        `chain[0].arguments.filterGroup[0]`
      );

      // add any new group to the array
      if (filterGroup && filterGroup !== '' && !acc.includes(String(filterGroup))) {
        acc.push(String(filterGroup));
      }
    }

    // extract groups from all expressions that use filters function
    if (el.expression != null && el.expression.length) {
      const expressionAst = fromExpression(el.expression) as
        | ExpressionAstFunction
        | ExpressionAstExpression;
      const groups = extractFilterGroups(expressionAst);
      groups.forEach((group) => {
        if (!acc.includes(String(group))) {
          acc.push(String(group));
        }
      });
    }

    return acc;
  }, []);

  return filterGroups.sort();
}

// element getters
export function getSelectedToplevelNodes(
  state: State
): State['transient']['selectedTopLevelNodes'] {
  return get(state, 'transient.selectedToplevelNodes', []);
}

export function getSelectedElementId(state: State): string | null {
  const toplevelNodes = getSelectedToplevelNodes(state);
  return toplevelNodes.length === 1 ? toplevelNodes[0] : null;
}

export function getSelectedElement(state: State): CanvasElement | undefined {
  return getElementById(state, getSelectedElementId(state));
}

export function getElements(
  state: State,
  pageId: string | undefined = undefined,
  withAst: boolean = true
): CanvasElement[] {
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
    // @ts-expect-error 'ast' is no longer on the CanvasElement type, but since we
    // have JS calling into this, we can't be certain this call isn't necessary.
    return elements.map((el) => omit(el, ['ast']));
  }

  const elementAppendAst = (elem: CanvasElement) => appendAst(elem);

  return elements.map(elementAppendAst);
}

const augment =
  (type: string) =>
  <T extends CanvasElement | CanvasGroup>(n: T): T => ({
    ...n,
    position: { ...n.position, type },
    ...(type === 'group' && { expression: 'shape fill="rgba(255,255,255,0)" | render' }), // fixme unify with mw/aeroelastic
  });

const getNodesOfPage = (page: CanvasPage): Array<CanvasElement | CanvasGroup> => {
  const elements: Array<CanvasElement | CanvasGroup> = get(page, 'elements').map(
    augment('element')
  );
  const groups = get(page, 'groups', [] as CanvasGroup[]).map(augment('group'));

  return elements.concat(groups);
};

export function getNodesForPage(page: CanvasPage, withAst: true): PositionedElement[];
export function getNodesForPage(page: CanvasPage, withAst: false): CanvasElement[];
export function getNodesForPage(
  page: CanvasPage,
  withAst: boolean
): CanvasElement[] | PositionedElement[];

export function getNodesForPage(
  page: CanvasPage,
  withAst: boolean
): Array<CanvasElement | CanvasGroup> {
  const elements = getNodesOfPage(page);

  if (!elements) {
    return [];
  }

  // explicitly strip the ast, basically a fix for corrupted workpads
  // due to https://github.com/elastic/kibana-canvas/issues/260
  // TODO: remove this once it's been in the wild a bit
  if (!withAst) {
    // @ts-expect-error 'ast' is no longer on the CanvasElement type, but since we
    // have JS calling into this, we can't be certain this call isn't necessary.
    return elements.map((el) => omit(el, ['ast']));
  }

  // @ts-expect-error All of this AST business needs to be cleaned up.
  return elements.map(appendAst);
}

// todo unify or DRY up with `getElements`
export function getNodes(
  state: State,
  pageId: string,
  withAst = true
): CanvasElement[] | PositionedElement[] {
  const id = pageId || getSelectedPage(state);
  if (!id) {
    return [];
  }

  const page = getPageById(state, id);
  if (!page) {
    return [];
  }

  return getNodesForPage(page, withAst);
}

export function getElementById(
  state: State,
  id: string | null,
  pageId?: string
): PositionedElement | undefined {
  const element = getElements(state, pageId, true).find((el) => el.id === id);
  if (element) {
    return appendAst(element);
  }
}

export function getNodeById(
  state: State,
  id: string,
  pageId: string
): PositionedElement | undefined {
  // do we need to pass a truthy empty array instead of `true`?
  const group = getNodes(state, pageId, true).find((el) => el.id === id);
  if (group) {
    return appendAst(group);
  }
}

// FIX: Fix the "any" typings below. Need to figure out how to properly type any "resolvedArg"
export function getResolvedArgs(state: State, elementId: string, path: any): any {
  if (!elementId) {
    return;
  }
  const args = get(state, ['transient', 'resolvedArgs', elementId]) as any;
  if (path) {
    return get(args, path);
  }
  return args;
}

export function getSelectedResolvedArgs(state: State, path: Array<string | number>): any {
  const elementId = getSelectedElementId(state);

  if (elementId) {
    return getResolvedArgs(state, elementId, path);
  }
}

export function getContextForIndex(
  state: State,
  parentPath: string,
  index: number
): ExpressionContext {
  return getSelectedResolvedArgs(state, ['expressionContext', parentPath, index - 1]);
}

export function getRefreshInterval(state: State): number {
  return get(state, 'transient.refresh.interval', 0);
}

export function getAutoplay(state: State): State['transient']['autoplay'] {
  return get(state, 'transient.autoplay');
}

export function getRenderedWorkpad(state: State) {
  const currentPages = getPages(state);
  const args = state.transient.resolvedArgs;
  const renderedPages = currentPages.map((page) => {
    const { elements, ...rest } = page;
    return {
      ...rest,
      elements: elements.map((element) => {
        const { id, position } = element;
        const arg = args[id];
        if (!arg) {
          return null;
        }
        const { expressionRenderable } = arg;

        return { id, position, expressionRenderable };
      }),
    };
  });

  const workpad = getWorkpad(state);

  const { pages, variables, ...rest } = workpad;

  return {
    pages: renderedPages,
    ...rest,
  } as CanvasRenderedWorkpad;
}

export function getRenderedWorkpadExpressions(state: State) {
  const workpad = getRenderedWorkpad(state);
  const { pages } = workpad;
  const expressions: string[] = [];

  pages.forEach((page) =>
    page.elements.forEach((element) => {
      if (element && element.expressionRenderable) {
        const { value } = element.expressionRenderable;
        if (value) {
          const { as } = value;
          if (!expressions.includes(as)) {
            expressions.push(as);
          }
        }
      }
    })
  );

  return expressions;
}
