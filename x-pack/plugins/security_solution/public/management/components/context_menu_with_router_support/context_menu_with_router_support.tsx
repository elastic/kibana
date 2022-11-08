/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { CSSProperties, HTMLAttributes, memo, useCallback, useMemo, useState } from 'react';
import {
  CommonProps,
  EuiContextMenuPanel,
  EuiContextMenuPanelProps,
  EuiPopover,
  EuiPopoverProps,
  EuiPopoverTitle,
  EuiLoadingContent,
} from '@elastic/eui';
import uuid from 'uuid';
import {
  ContextMenuItemNavByRouter,
  ContextMenuItemNavByRouterProps,
} from './context_menu_item_nav_by_router';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';

export interface ContextMenuWithRouterSupportProps
  extends CommonProps,
    Pick<EuiPopoverProps, 'button' | 'anchorPosition' | 'panelPaddingSize'> {
  items: ContextMenuItemNavByRouterProps[];
  /**
   * The max width for the popup menu. Default is `32ch`.
   * **Note** that when used (default behaviour), all menu item's `truncateText` prop will be
   * overwritten to `true`. Setting this prop's value to `undefined` will suppress the default behaviour.
   */
  maxWidth?: CSSProperties['maxWidth'];
  /**
   * If `true`, then the menu will have a fixed width and will not be adjusted if the content it holds
   * is shorter than `maxWidth` prop value.
   */
  fixedWidth?: boolean;
  /**
   * The max height for the popup menu. Default is `255px`.
   */
  maxHeight?: CSSProperties['maxHeight'];
  /**
   * It makes the panel scrollable
   */
  title?: string;
  loading?: boolean;
  hoverInfo?: React.ReactNode;
}

/**
 * A context menu that allows for items in the menu to route to other Kibana destinations using the Router
 * (thus avoiding full page refreshes).
 * Menu also supports automatically closing the popup when an item is clicked.
 */
export const ContextMenuWithRouterSupport = memo<ContextMenuWithRouterSupportProps>(
  ({
    items,
    button,
    panelPaddingSize,
    anchorPosition,
    maxWidth = '32ch',
    maxHeight = '255px',
    fixedWidth = false,
    title,
    loading = false,
    hoverInfo,
    ...commonProps
  }) => {
    const getTestId = useTestIdGenerator(commonProps['data-test-subj']);
    const [isOpen, setIsOpen] = useState(false);

    const handleCloseMenu = useCallback(() => setIsOpen(false), [setIsOpen]);
    const handleToggleMenu = useCallback(() => setIsOpen(!isOpen), [isOpen]);

    const panelProps: EuiPopoverProps['panelProps'] = useMemo(() => {
      return { 'data-test-subj': getTestId('popoverPanel') };
    }, [getTestId]);

    const menuItems: EuiContextMenuPanelProps['items'] = useMemo(() => {
      return items.map((itemProps, index) => {
        if (loading) {
          return (
            <EuiLoadingContent
              lines={1}
              key={uuid.v4()}
              data-test-subj={itemProps['data-test-subj'] ?? getTestId(`item-loading-${index}`)}
            />
          );
        }
        return (
          <ContextMenuItemNavByRouter
            {...itemProps}
            key={uuid.v4()}
            data-test-subj={itemProps['data-test-subj'] ?? getTestId(`item-${index}`)}
            textTruncate={Boolean(maxWidth) || itemProps.textTruncate}
            hoverInfo={hoverInfo}
            onClick={(ev) => {
              handleCloseMenu();
              if (itemProps.onClick) {
                return itemProps.onClick(ev);
              }
            }}
          />
        );
      });
    }, [getTestId, handleCloseMenu, items, maxWidth, loading, hoverInfo]);

    type AdditionalPanelProps = Partial<
      Omit<EuiContextMenuPanelProps & HTMLAttributes<HTMLDivElement>, 'style'>
    > & {
      style: Required<HTMLAttributes<HTMLDivElement>>['style'];
    };
    const additionalContextMenuPanelProps = useMemo<AdditionalPanelProps>(() => {
      const newAdditionalProps: AdditionalPanelProps = {
        className: 'eui-yScroll',
        style: {},
      };

      if (maxWidth && !fixedWidth) {
        newAdditionalProps.style.maxWidth = maxWidth;
      }

      if (maxHeight) {
        newAdditionalProps.style.maxHeight = maxHeight;
      }

      if (fixedWidth) {
        newAdditionalProps.style.width = maxWidth ?? '32ch';
      }

      return newAdditionalProps;
    }, [maxWidth, fixedWidth, maxHeight]);

    return (
      <EuiPopover
        {...commonProps}
        anchorPosition={anchorPosition}
        panelPaddingSize={panelPaddingSize}
        panelProps={panelProps}
        button={
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <div
            className="eui-displayInlineBlock"
            data-test-subj={getTestId('triggerButtonWrapper')}
            onClick={handleToggleMenu}
          >
            {button}
          </div>
        }
        isOpen={isOpen}
        closePopover={handleCloseMenu}
      >
        {title ? <EuiPopoverTitle paddingSize="m">{title}</EuiPopoverTitle> : null}
        <EuiContextMenuPanel
          hasFocus={false}
          {...additionalContextMenuPanelProps}
          items={menuItems}
        />
      </EuiPopover>
    );
  }
);
ContextMenuWithRouterSupport.displayName = 'ContextMenuWithRouterSupport';
