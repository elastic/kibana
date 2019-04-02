/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import 'jest-styled-components';
import * as React from 'react';

import { TestProviders } from '../../mock/test_providers';

import {
  addGlobalResizeCursorStyleToBody,
  globalResizeCursorClassName,
  isResizing,
  removeGlobalResizeCursorStyleFromBody,
  Resizeable,
} from '.';
import { CellResizeHandle } from './styled_handles';

describe('Resizeable', () => {
  afterEach(() => {
    document.body.classList.remove(globalResizeCursorClassName);
  });

  test('it applies the provided height to the ResizeHandleContainer when a height is specified', () => {
    const wrapper = mount(
      <TestProviders>
        <Resizeable
          handle={<CellResizeHandle data-test-subj="test-resize-handle" />}
          height="100%"
          id="test"
          onResize={jest.fn()}
          render={() => <></>}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="resize-handle-container"]').first()).toHaveStyleRule(
      'height',
      '100%'
    );
  });

  test('it renders', () => {
    const wrapper = shallow(
      <TestProviders>
        <Resizeable
          handle={<CellResizeHandle data-test-subj="test-resize-handle" />}
          height="100%"
          id="test"
          onResize={jest.fn()}
          render={() => <></>}
        />
      </TestProviders>
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  describe('resize cursor styling', () => {
    test('it does NOT apply the global-resize-cursor style to the body by default', () => {
      mount(
        <TestProviders>
          <Resizeable
            handle={<CellResizeHandle data-test-subj="test-resize-handle" />}
            height="100%"
            id="test"
            onResize={jest.fn()}
            render={() => <></>}
          />
        </TestProviders>
      );

      expect(document.body.className).not.toContain(globalResizeCursorClassName);
    });

    describe('#addGlobalResizeCursorStyleToBody', () => {
      test('it adds the global-resize-cursor style to the body', () => {
        mount(
          <TestProviders>
            <Resizeable
              handle={<CellResizeHandle data-test-subj="test-resize-handle" />}
              height="100%"
              id="test"
              onResize={jest.fn()}
              render={() => <></>}
            />
          </TestProviders>
        );

        addGlobalResizeCursorStyleToBody();

        expect(document.body.className).toContain(globalResizeCursorClassName);
      });
    });

    describe('#removeGlobalResizeCursorStyleFromBody', () => {
      test('it removes the global-resize-cursor style from body', () => {
        mount(
          <TestProviders>
            <Resizeable
              handle={<CellResizeHandle data-test-subj="test-resize-handle" />}
              height="100%"
              id="test"
              onResize={jest.fn()}
              render={() => <></>}
            />
          </TestProviders>
        );

        addGlobalResizeCursorStyleToBody();
        removeGlobalResizeCursorStyleFromBody();

        expect(document.body.className).not.toContain(globalResizeCursorClassName);
      });
    });

    describe('#isResizing', () => {
      test('it returns true when the global-resize-cursor is present on the body', () => {
        mount(
          <TestProviders>
            <Resizeable
              handle={<CellResizeHandle data-test-subj="test-resize-handle" />}
              height="100%"
              id="test"
              onResize={jest.fn()}
              render={() => <></>}
            />
          </TestProviders>
        );

        addGlobalResizeCursorStyleToBody();

        expect(isResizing()).toEqual(true);
      });

      test('it returns false when the global-resize-cursor is NOT present on the body', () => {
        mount(
          <TestProviders>
            <Resizeable
              handle={<CellResizeHandle data-test-subj="test-resize-handle" />}
              height="100%"
              id="test"
              onResize={jest.fn()}
              render={() => <></>}
            />
          </TestProviders>
        );

        expect(isResizing()).toEqual(false);
      });
    });
  });
});
