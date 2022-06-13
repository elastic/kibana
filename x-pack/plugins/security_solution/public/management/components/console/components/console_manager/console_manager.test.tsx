/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook as _renderHook, RenderHookResult, act } from '@testing-library/react-hooks';
import { ConsoleManager, useConsoleManager } from './console_manager';
import React, { memo } from 'react';
import type {
  ConsoleManagerClient,
  ConsoleRegistrationInterface,
  RegisteredConsoleClient,
} from './types';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../common/mock/endpoint';
import { ConsoleManagerTestComponent, getNewConsoleRegistrationMock } from './mocks';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';
import { enterConsoleCommand } from '../../mocks';

describe('When using ConsoleManager', () => {
  describe('and using the ConsoleManagerInterface via the hook', () => {
    type RenderResultInterface = RenderHookResult<never, ConsoleManagerClient>;

    let renderHook: () => RenderResultInterface;
    let renderResult: RenderResultInterface;

    const registerNewConsole = (): ConsoleRegistrationInterface => {
      const newConsole = getNewConsoleRegistrationMock();

      act(() => {
        renderResult.result.current.register(newConsole);
      });

      return newConsole;
    };

    beforeEach(() => {
      const { AppWrapper } = createAppRootMockRenderer();

      const RenderWrapper = memo(({ children }) => {
        return (
          <AppWrapper>
            <ConsoleManager>{children}</ConsoleManager>
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
      const newConsole = getNewConsoleRegistrationMock();

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
      renderHook();
      const { id: consoleId } = registerNewConsole();
      act(() => {
        renderResult.result.current.show(consoleId);
      });

      expect(renderResult.result.current.getOne(consoleId)!.isVisible()).toBe(true);
    });

    it('should throw if attempting to show a console with invalid `id`', () => {
      renderHook();

      expect(() => renderResult.result.current.show('some id')).toThrow(
        'Console with id some id not found'
      );
    });

    it('should hide a console by `id`', () => {
      renderHook();
      const { id: consoleId } = registerNewConsole();
      act(() => {
        renderResult.result.current.show(consoleId);
      });

      expect(renderResult.result.current.getOne(consoleId)!.isVisible()).toBe(true);

      act(() => {
        renderResult.result.current.hide(consoleId);
      });

      expect(renderResult.result.current.getOne(consoleId)!.isVisible()).toBe(false);
    });

    it('should throw if attempting to hide a console with invalid `id`', () => {
      renderHook();

      expect(() => renderResult.result.current.hide('some id')).toThrow(
        'Console with id some id not found'
      );
    });

    it('should terminate a console by `id`', () => {
      renderHook();
      const { id: consoleId } = registerNewConsole();

      expect(renderResult.result.current.getOne(consoleId)).toBeTruthy();

      act(() => {
        renderResult.result.current.terminate(consoleId);
      });

      expect(renderResult.result.current.getOne(consoleId)).toBeUndefined();
    });

    it('should call `onBeforeTerminate()`', () => {
      renderHook();
      const { id: consoleId, onBeforeTerminate } = registerNewConsole();

      act(() => {
        renderResult.result.current.terminate(consoleId);
      });

      expect(onBeforeTerminate).toHaveBeenCalled();
    });

    it('should throw if attempting to terminate a console with invalid `id`', () => {
      renderHook();

      expect(() => renderResult.result.current.terminate('some id')).toThrow(
        'Console with id some id not found'
      );
    });

    it('should return list of registered consoles when calling `getList()`', () => {
      renderHook();
      registerNewConsole();
      registerNewConsole();

      expect(renderResult.result.current.getList()).toHaveLength(2);
    });

    describe('and using the Registered Console client interface', () => {
      let consoleId: string;
      let registeredConsole: Readonly<RegisteredConsoleClient>;

      beforeEach(() => {
        renderHook();
        ({ id: consoleId } = registerNewConsole());
        registeredConsole = renderResult.result.current.getOne(consoleId)!;
      });

      it('should have the expected interface', () => {
        expect(registeredConsole).toEqual({
          id: expect.any(String),
          meta: expect.any(Object),
          title: expect.anything(),
          show: expect.any(Function),
          hide: expect.any(Function),
          terminate: expect.any(Function),
          isVisible: expect.any(Function),
        });
      });

      it('should display the console when `.show()` is called', async () => {
        registeredConsole.show();
        await renderResult.waitForNextUpdate();

        expect(registeredConsole.isVisible()).toBe(true);
      });

      it('should hide the console when `.hide()` is called', async () => {
        registeredConsole.show();
        await renderResult.waitForNextUpdate();
        expect(registeredConsole.isVisible()).toBe(true);

        registeredConsole.hide();
        await renderResult.waitForNextUpdate();
        expect(registeredConsole.isVisible()).toBe(false);
      });

      it('should un-register the console when `.terminate() is called', async () => {
        registeredConsole.terminate();
        await renderResult.waitForNextUpdate();

        expect(renderResult.result.current.getOne(consoleId)).toBeUndefined();
      });
    });
  });

  describe('and when the console popup is rendered into the page', () => {
    let render: () => Promise<ReturnType<AppContextTestRender['render']>>;
    let renderResult: ReturnType<AppContextTestRender['render']>;

    const clickOnRegisterNewConsole = () => {
      act(() => {
        userEvent.click(renderResult.getByTestId('registerNewConsole'));
      });
    };

    const openRunningConsole = async () => {
      act(() => {
        userEvent.click(renderResult.queryAllByTestId('showRunningConsole')[0]);
      });

      await waitFor(() => {
        expect(
          renderResult.getByTestId('consolePopupWrapper').classList.contains('is-hidden')
        ).toBe(false);
      });
    };

    beforeEach(() => {
      const mockedContext = createAppRootMockRenderer();

      render = async () => {
        renderResult = mockedContext.render(
          <ConsoleManager>
            <ConsoleManagerTestComponent />
          </ConsoleManager>
        );

        clickOnRegisterNewConsole();

        await waitFor(() => {
          expect(renderResult.queryAllByTestId('runningConsole').length).toBeGreaterThan(0);
        });

        await openRunningConsole();

        return renderResult;
      };
    });

    it('should show the title', async () => {
      await render();

      expect(renderResult.getByTestId('consolePopupHeader').textContent).toMatch(/Test console/);
    });

    it('should show the console', async () => {
      await render();

      expect(renderResult.getByTestId('testRunningConsole')).toBeTruthy();
    });

    it('should show `terminate` button', async () => {
      await render();

      expect(renderResult.getByTestId('consolePopupTerminateButton')).toBeTruthy();
    });

    it('should show `hide` button', async () => {
      await render();

      expect(renderResult.getByTestId('consolePopupHideButton')).toBeTruthy();
    });

    it('should hide the console popup', async () => {
      await render();
      userEvent.click(renderResult.getByTestId('consolePopupHideButton'));

      await waitFor(() => {
        expect(
          renderResult.getByTestId('consolePopupWrapper').classList.contains('is-hidden')
        ).toBe(true);
      });
    });

    it("should persist a console's command output history on hide/show", async () => {
      await render();
      enterConsoleCommand(renderResult, 'help', { dataTestSubj: 'testRunningConsole' });
      enterConsoleCommand(renderResult, 'help', { dataTestSubj: 'testRunningConsole' });

      await waitFor(() => {
        expect(renderResult.queryAllByTestId('testRunningConsole-historyItem')).toHaveLength(2);
      });

      userEvent.click(renderResult.getByTestId('consolePopupHideButton'));
      await waitFor(() => {
        expect(
          renderResult.getByTestId('consolePopupWrapper').classList.contains('is-hidden')
        ).toBe(true);
      });

      await openRunningConsole();

      await waitFor(() => {
        expect(renderResult.queryAllByTestId('testRunningConsole-historyItem')).toHaveLength(2);
      });
    });

    describe('and the terminate confirmation is shown', () => {
      const clickOnTerminateButton = async () => {
        userEvent.click(renderResult.getByTestId('consolePopupTerminateButton'));

        await waitFor(() => {
          expect(renderResult.getByTestId('consolePopupTerminateConfirmModal')).toBeTruthy();
        });
      };

      beforeEach(async () => {
        await render();
        await clickOnTerminateButton();
      });

      it('should show confirmation when terminate button is clicked', async () => {
        expect(renderResult.getByTestId('consolePopupTerminateConfirmMessage')).toBeTruthy();
      });

      it('should show cancel and terminate buttons', async () => {
        expect(renderResult.getByTestId('consolePopupTerminateModalCancelButton')).toBeTruthy();
        expect(renderResult.getByTestId('consolePopupTerminateModalTerminateButton')).toBeTruthy();
      });

      it('should hide the confirmation when cancel is clicked', async () => {
        userEvent.click(renderResult.getByTestId('consolePopupTerminateModalCancelButton'));

        await waitFor(() => {
          expect(renderResult.queryByTestId('consolePopupTerminateConfirmModal')).toBeNull();
        });
      });

      it('should terminate when terminate is clicked', async () => {
        userEvent.click(renderResult.getByTestId('consolePopupTerminateModalTerminateButton'));

        await waitFor(() => {
          expect(
            renderResult.getByTestId('consolePopupWrapper').classList.contains('is-hidden')
          ).toBe(true);
        });
      });
    });
  });
});
