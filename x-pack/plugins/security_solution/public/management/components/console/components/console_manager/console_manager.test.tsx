/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook as _renderHook, RenderHookResult, act } from '@testing-library/react-hooks';
import { waitFor, getByTestId } from '@testing-library/react';
import { ConsoleManager, useConsoleManager } from './console_manager';
import React, { memo } from 'react';
import type { ConsoleManagerClient, ConsoleRegistrationInterface } from './types';
import { getCommandServiceMock } from '../../mocks';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';

describe('When using ConsoleManager', () => {
  describe('and using the ConsoleManagerInterface via the hook', () => {
    type RenderResultInterface = RenderHookResult<never, ConsoleManagerClient>;

    let renderHook: () => RenderResultInterface;
    let renderResult: RenderResultInterface;

    const getConsoleRegistration = (
      overrides: Partial<ConsoleRegistrationInterface> = {}
    ): ConsoleRegistrationInterface => {
      return {
        id: Math.random().toString(36),
        title: 'Test console',
        meta: { about: 'for unit testing ' },
        consoleProps: {
          'data-test-subj': 'testRunningConsole',
          commandService: getCommandServiceMock(),
        },
        onBeforeTerminate: jest.fn(),
        ...overrides,
      };
    };

    const registerNewConsole = (): string => {
      const newConsole = getConsoleRegistration();

      act(() => {
        renderResult.result.current.register(newConsole);
      });

      return newConsole.id;
    };

    beforeEach(() => {
      const { AppWrapper } = createAppRootMockRenderer();

      const RenderWrapper = memo(({ children }) => {
        return (
          <AppWrapper>
            <ConsoleManager>{children}</ConsoleManager>{' '}
          </AppWrapper>
        );
      });
      RenderWrapper.displayName = 'RenderWrapper';

      renderHook = () => {
        renderResult = _renderHook(useConsoleManager, {
          wrapper: RenderWrapper,
        });

        return renderResult;
      };
    });

    it('should return the expected interface', async () => {
      renderHook();

      expect(renderResult.result.current).toEqual({
        getList: expect.any(Function),
        getOne: expect.any(Function),
        hide: expect.any(Function),
        register: expect.any(Function),
        show: expect.any(Function),
        terminate: expect.any(Function),
      });
    });

    it('should register a console', () => {
      const newConsole = getConsoleRegistration();

      renderHook();
      act(() => {
        renderResult.result.current.register(newConsole);
      });

      expect(renderResult.result.current.getOne(newConsole.id)).toEqual({
        id: newConsole.id,
        title: newConsole.title,
        meta: newConsole.meta,
        show: expect.any(Function),
        hide: expect.any(Function),
        terminate: expect.any(Function),
        isVisible: expect.any(Function),
      });
    });

    it('should show a console by `id`', async () => {
      const { waitForNextUpdate } = renderHook();
      const consoleId = registerNewConsole();
      act(() => {
        renderResult.result.current.show(consoleId);
      });
      await waitForNextUpdate();

      expect(renderResult.result.current.getOne(consoleId)!.isVisible()).toBe(true);
    });

    it('should throw if attempting to show a console with invalid `id`', () => {
      renderHook();

      expect(() => renderResult.result.current.show('some id')).toThrow(
        'Unable to show Console with id some id. Not found.'
      );
    });

    it('should hide a console by `id`', () => {
      renderHook();
      const consoleId = registerNewConsole();
      act(() => {
        renderResult.result.current.show(consoleId);
      });

      expect(renderResult.result.current.getOne(consoleId)!.isVisible()).toBe(true);

      act(() => {
        renderResult.result.current.hide(consoleId);
      });

      expect(renderResult.result.current.getOne(consoleId)!.isVisible()).toBe(false);
    });

    it.todo('should throw if attempting to hide a console with invalid `id`');

    it.todo('should terminate a console by `id`');

    it.todo('should call `onBeforeTerminate()`');

    it.todo('should throw if attempting to terminate a console with invalid `id`');

    it.todo('should return a registered console when calling `getOne()`');

    it.todo('should return `undefined` when calling getOne() with invalid `id`');

    it.todo('should return list of registered consoles when calling `getList()`');

    describe('and using the Registered Console client interface', () => {
      it.todo('should have the expected interface');

      it.todo('should display the console when `.show()` is called');

      it.todo('should hide the console when `.hide()` is called');

      it.todo('should un-register the console when `.terminate() is called');
    });
  });

  describe('and when the console popup is rendered into the page', () => {
    it.todo('should show the title');

    it.todo('should show the console');

    it.todo('should show `terminate` button');

    it.todo('should show `hide` button');

    it.todo('should hide the popup');

    it.todo("should persist a console's command output history");

    describe('and the terminate confirmation is shown', () => {
      it.todo('should show confirmation when terminate button is clicked');

      it.todo('should show message confirmation');

      it.todo('should show cancel and terminate buttons');

      it.todo('should hide the confirmation when cancel is clicked');

      it.todo('should terminate when terminate is clicked');
    });
  });
});
