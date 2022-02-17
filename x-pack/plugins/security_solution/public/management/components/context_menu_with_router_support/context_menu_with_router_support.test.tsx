/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../common/mock/endpoint';
import {
  ContextMenuWithRouterSupport,
  ContextMenuWithRouterSupportProps,
} from './context_menu_with_router_support';
import { act, fireEvent, waitForElementToBeRemoved } from '@testing-library/react';
import { APP_UI_ID } from '../../../../common/constants';

describe('When using the ContextMenuWithRouterSupport component', () => {
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: (
    props?: Partial<ContextMenuWithRouterSupportProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let items: ContextMenuWithRouterSupportProps['items'];

  const clickMenuTriggerButton = () => {
    act(() => {
      fireEvent.click(renderResult.getByTestId('testMenu-triggerButton'));
    });
  };

  const getContextMenuPanel = () => renderResult.queryByTestId('testMenu-popoverPanel');

  beforeEach(() => {
    appTestContext = createAppRootMockRenderer();

    items = [
      {
        children: 'click me 1',
        'data-test-subj': 'menu-item-one',
        textTruncate: false,
      },
      {
        children: 'click me 2',
        navigateAppId: APP_UI_ID,
        navigateOptions: {
          path: '/one/two/three',
        },
        href: 'http://some-url.elastic/one/two/three',
      },
      {
        children: 'click me 3 with some very long text here that needs to be truncated',
        textTruncate: true,
      },
    ];

    render = (overrideProps = {}) => {
      const props: ContextMenuWithRouterSupportProps = {
        items,
        'data-test-subj': 'testMenu',
        button: <EuiButtonEmpty data-test-subj="testMenu-triggerButton">{'Menu'}</EuiButtonEmpty>,
        ...overrideProps,
      };

      renderResult = appTestContext.render(<ContextMenuWithRouterSupport {...props} />);

      return renderResult;
    };
  });

  it('should toggle the context menu when button is clicked', () => {
    render();

    expect(getContextMenuPanel()).toBeNull();

    clickMenuTriggerButton();

    expect(getContextMenuPanel()).not.toBeNull();
  });

  it('should auto include test subjects on items if one is not defined by the menu item props', () => {
    render();
    clickMenuTriggerButton();

    // this test id should be unchanged from what the Props for the item
    expect(renderResult.getByTestId('menu-item-one')).not.toBeNull();

    // these should have been auto-inserted
    expect(renderResult.getByTestId('testMenu-item-1')).not.toBeNull();
    expect(renderResult.getByTestId('testMenu-item-2')).not.toBeNull();
  });

  it('should truncate text of menu item when `textTruncate` prop is `true`', () => {
    render({ maxWidth: undefined });
    clickMenuTriggerButton();

    expect(renderResult.getByTestId('testMenu-item-2-truncateWrapper')).not.toBeNull();
  });

  it('should close menu when a menu item is clicked and call menu item onclick callback', async () => {
    render();
    clickMenuTriggerButton();
    await act(async () => {
      const menuPanelRemoval = waitForElementToBeRemoved(getContextMenuPanel());
      fireEvent.click(renderResult.getByTestId('menu-item-one'));
      await menuPanelRemoval;
    });

    expect(getContextMenuPanel()).toBeNull();
  });

  it('should truncate menu and menu item content when `maxWidth` is used', () => {
    render();
    clickMenuTriggerButton();

    expect(renderResult.getByTestId('menu-item-one-truncateWrapper')).not.toBeNull();
    expect(renderResult.getByTestId('testMenu-item-1-truncateWrapper')).not.toBeNull();
    expect(renderResult.getByTestId('testMenu-item-2-truncateWrapper')).not.toBeNull();
  });

  it('should render popup menu with a fixed width that matches the `maxWidth` value', () => {
    render({ maxWidth: '300px', fixedWidth: true });
    clickMenuTriggerButton();
    const contextMenuPanelStyles = getContextMenuPanel()!
      .querySelector('.euiContextMenuPanel')!
      .getAttribute('style');

    expect(contextMenuPanelStyles).toMatch(/width:\W*300px/);
    expect(contextMenuPanelStyles).not.toMatch(/max-width:\W*300px/);
  });

  it('should navigate using the router when item is clicked', () => {
    render();
    clickMenuTriggerButton();
    act(() => {
      fireEvent.click(renderResult.getByTestId('testMenu-item-1'));
    });

    expect(appTestContext.coreStart.application.navigateToApp).toHaveBeenCalledWith(
      APP_UI_ID,
      expect.objectContaining({ path: '/one/two/three' })
    );
  });

  it('should display loading state', () => {
    render({ loading: true });
    clickMenuTriggerButton();
    expect(renderResult.getByTestId('testMenu-item-loading-1')).not.toBeNull();
    expect(renderResult.getByTestId('testMenu-item-loading-2')).not.toBeNull();
  });

  it('should display view details button when prop', () => {
    render({ hoverInfo: 'test' });
    clickMenuTriggerButton();
    expect(renderResult.getByTestId('testMenu-item-1').textContent).toEqual('click me 2test');
  });

  it("shouldn't display view details button when no prop", () => {
    render();
    clickMenuTriggerButton();
    expect(renderResult.getByTestId('testMenu-item-1').textContent).toEqual('click me 2');
  });
});
