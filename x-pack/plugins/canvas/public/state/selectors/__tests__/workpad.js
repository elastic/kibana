/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import * as selector from '../workpad';

describe('workpad selectors', () => {
  let asts;
  let state;

  beforeEach(() => {
    asts = {
      'element-0': {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'markdown',
            arguments: {},
          },
        ],
      },
      'element-1': {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'demodata',
            arguments: {},
          },
        ],
      },
    };

    state = {
      transient: {
        selectedElement: 'element-1',
        resolvedArgs: {
          'element-0': 'test resolved arg, el 0',
          'element-1': 'test resolved arg, el 1',
          'element-2': {
            example1: 'first thing',
            example2: ['why not', 'an array?'],
            example3: {
              deeper: {
                object: true,
              },
            },
          },
        },
      },
      persistent: {
        workpad: {
          id: 'workpad-1',
          page: 0,
          pages: [
            {
              id: 'page-1',
              elements: [
                {
                  id: 'element-0',
                  expression: 'markdown',
                },
                {
                  id: 'element-1',
                  expression: 'demodata',
                },
              ],
            },
          ],
          isWriteable: false,
        },
      },
    };
  });

  describe('empty state', () => {
    it('returns undefined', () => {
      expect(selector.getSelectedPage({})).to.be(undefined);
      expect(selector.getPageById({}, 'page-1')).to.be(undefined);
      expect(selector.getSelectedElement({})).to.be(undefined);
      expect(selector.getSelectedElementId({})).to.be(undefined);
      expect(selector.getElementById({}, 'element-1')).to.be(undefined);
      expect(selector.getResolvedArgs({}, 'element-1')).to.be(undefined);
      expect(selector.getSelectedResolvedArgs({})).to.be(undefined);
      expect(selector.isWriteable({})).to.be(true);
    });
  });

  describe('getSelectedPage', () => {
    it('returns the selected page', () => {
      expect(selector.getSelectedPage(state)).to.equal('page-1');
    });
  });

  describe('getPages', () => {
    it('return an empty array with no pages', () => {
      expect(selector.getPages({})).to.eql([]);
    });

    it('returns all pages in persisent state', () => {
      expect(selector.getPages(state)).to.eql(state.persistent.workpad.pages);
    });
  });

  describe('getPageById', () => {
    it('should return matching page', () => {
      expect(selector.getPageById(state, 'page-1')).to.eql(state.persistent.workpad.pages[0]);
    });
  });

  describe('getSelectedElement', () => {
    it('returns selected element', () => {
      const { elements } = state.persistent.workpad.pages[0];
      expect(selector.getSelectedElement(state)).to.eql({
        ...elements[1],
        ast: asts['element-1'],
      });
    });
  });

  describe('getSelectedElementId', () => {
    it('returns selected element id', () => {
      expect(selector.getSelectedElementId(state)).to.equal('element-1');
    });
  });

  describe('getElements', () => {
    it('is an empty array with no state', () => {
      expect(selector.getElements({})).to.eql([]);
    });

    it('returns all elements on the page', () => {
      const { elements } = state.persistent.workpad.pages[0];
      const expected = elements.map(element => ({
        ...element,
        ast: asts[element.id],
      }));
      expect(selector.getElements(state)).to.eql(expected);
    });
  });

  describe('getElementById', () => {
    it('returns element matching id', () => {
      const { elements } = state.persistent.workpad.pages[0];
      expect(selector.getElementById(state, 'element-0')).to.eql({
        ...elements[0],
        ast: asts['element-0'],
      });
      expect(selector.getElementById(state, 'element-1')).to.eql({
        ...elements[1],
        ast: asts['element-1'],
      });
    });
  });

  describe('getResolvedArgs', () => {
    it('returns resolved args by element id', () => {
      expect(selector.getResolvedArgs(state, 'element-0')).to.equal('test resolved arg, el 0');
    });

    it('returns resolved args at given path', () => {
      const arg = selector.getResolvedArgs(state, 'element-2', 'example1');
      expect(arg).to.equal('first thing');
    });
  });

  describe('getSelectedResolvedArgs', () => {
    it('returns resolved args for selected element', () => {
      expect(selector.getSelectedResolvedArgs(state)).to.equal('test resolved arg, el 1');
    });

    it('returns resolved args at given path', () => {
      const tmpState = {
        ...state,
        transient: {
          ...state.transient,
          selectedElement: 'element-2',
        },
      };
      const arg = selector.getSelectedResolvedArgs(tmpState, 'example2');
      expect(arg).to.eql(['why not', 'an array?']);
    });

    it('returns resolved args at given deep path', () => {
      const tmpState = {
        ...state,
        transient: {
          ...state.transient,
          selectedElement: 'element-2',
        },
      };
      const arg = selector.getSelectedResolvedArgs(tmpState, ['example3', 'deeper', 'object']);
      expect(arg).to.be(true);
    });
  });

  describe('isWriteable', () => {
    it('returns boolean for if the workpad is writeable', () => {
      expect(selector.isWriteable(state)).to.equal(false);
    });
  });
});
