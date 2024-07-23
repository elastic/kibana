/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/css';
import { ChromeOption, InvestigateWidgetColumnSpan } from '@kbn/investigate-plugin/public';
import { keyBy, mapValues, orderBy } from 'lodash';
import React, { useCallback, useMemo, useRef } from 'react';
import { ItemCallback, Layout, Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { EuiBreakpoint, EUI_BREAKPOINTS, useBreakpoints } from '../../hooks/use_breakpoints';
import { useTheme } from '../../hooks/use_theme';
import { GridItem, GRID_ITEM_HEADER_HEIGHT } from '../grid_item';
import './styles.scss';

const gridContainerClassName = css`
  position: relative;

  .react-resizable-handle-ne,
  .react-resizable-handle-nw {
    top: calc(${GRID_ITEM_HEADER_HEIGHT}px) !important;
  }
`;

interface SingleComponentSection {
  item: InvestigateWidgetGridItem;
}

interface GridSection {
  items: InvestigateWidgetGridItem[];
}

type Section = SingleComponentSection | GridSection;

export interface InvestigateWidgetGridItemOverride {
  id: string;
  label: React.ReactNode;
}

export interface InvestigateWidgetGridItem {
  title: string;
  description: string;
  element: React.ReactNode;
  id: string;
  columns: number;
  rows: number;
  locked: boolean;
  chrome?: ChromeOption;
  loading: boolean;
  overrides: InvestigateWidgetGridItemOverride[];
}

interface InvestigateWidgetGridProps {
  items: InvestigateWidgetGridItem[];
  onItemsChange: (items: InvestigateWidgetGridItem[]) => Promise<void>;
  onItemCopy: (item: InvestigateWidgetGridItem) => Promise<void>;
  onItemDelete: (item: InvestigateWidgetGridItem) => Promise<void>;
  onItemLockToggle: (item: InvestigateWidgetGridItem) => Promise<void>;
  onItemOverrideRemove: (
    item: InvestigateWidgetGridItem,
    override: InvestigateWidgetGridItemOverride
  ) => Promise<void>;
  onItemTitleChange: (item: InvestigateWidgetGridItem, title: string) => Promise<void>;
  onItemEditClick: (item: InvestigateWidgetGridItem) => void;
  fadeLockedItems: boolean;
}

const ROW_HEIGHT = 32;

const BREAKPOINT_COLUMNS: Record<EuiBreakpoint, InvestigateWidgetColumnSpan> = {
  [EUI_BREAKPOINTS.xs]: 1,
  [EUI_BREAKPOINTS.s]: 1,
  [EUI_BREAKPOINTS.m]: 4,
  [EUI_BREAKPOINTS.l]: 4,
  [EUI_BREAKPOINTS.xl]: 4,
};

const panelContainerClassName = css`
  display: flex;
`;

function getResponsiveLayouts(
  items: InvestigateWidgetGridItem[],
  currentBreakpoint: EuiBreakpoint
) {
  const nextLayouts: Layout[] = [];

  let atColumn = 0;
  let atRow = 0;

  let rowHeight = 0;

  const maxColumns = BREAKPOINT_COLUMNS[currentBreakpoint];

  items.forEach((item) => {
    const itemColumns = item.columns;
    const itemRows = item.rows;

    if (atColumn + itemColumns > maxColumns) {
      atColumn = 0;
      atRow += rowHeight;
      rowHeight = 0;
    }

    nextLayouts.push({
      i: item.id,
      w: itemColumns,
      h: itemRows,
      x: atColumn,
      y: atRow,
      resizeHandles: ['ne', 'se'],
    });

    atColumn += itemColumns;

    rowHeight = Math.max(itemRows, rowHeight);
  });

  return mapValues(EUI_BREAKPOINTS, () => nextLayouts);
}

const CONTAINER_PADDING: [number, number] = [0, 0];

function GridSectionRenderer({
  items,
  onItemsChange,
  onItemDelete,
  onItemCopy,
  onItemLockToggle,
  onItemOverrideRemove,
  onItemTitleChange,
  onItemEditClick,
  fadeLockedItems,
}: InvestigateWidgetGridProps) {
  const WithFixedWidth = useMemo(() => WidthProvider(Responsive), []);

  const theme = useTheme();

  const callbacks = {
    onItemsChange,
    onItemCopy,
    onItemDelete,
    onItemLockToggle,
    onItemOverrideRemove,
    onItemTitleChange,
    onItemEditClick,
  };

  const itemCallbacksRef = useRef(callbacks);

  itemCallbacksRef.current = callbacks;

  const { currentBreakpoint } = useBreakpoints();

  const layouts = useMemo(() => {
    return getResponsiveLayouts(items, currentBreakpoint);
  }, [items, currentBreakpoint]);

  const gridElements = useMemo(() => {
    return items.map((item) => (
      <div key={item.id} className={panelContainerClassName}>
        <GridItem
          id={item.id}
          title={item.title}
          description={item.description}
          onTitleChange={(title) => {
            return itemCallbacksRef.current.onItemTitleChange(item, title);
          }}
          onCopy={() => {
            return itemCallbacksRef.current.onItemCopy(item);
          }}
          onDelete={() => {
            return itemCallbacksRef.current.onItemDelete(item);
          }}
          locked={item.locked}
          onLockToggle={() => {
            itemCallbacksRef.current.onItemLockToggle(item);
          }}
          onOverrideRemove={(override) => {
            return itemCallbacksRef.current.onItemOverrideRemove(item, override);
          }}
          onEditClick={() => {
            return itemCallbacksRef.current.onItemEditClick(item);
          }}
          overrides={item.overrides}
          loading={item.loading}
          faded={fadeLockedItems && item.locked}
        >
          {item.element}
        </GridItem>
      </div>
    ));
  }, [items, fadeLockedItems]);

  // react-grid calls `onLayoutChange` every time
  // `layouts` changes, except when on mount. So...
  // we do some gymnastics to skip the first call
  // after a layout change

  const prevLayouts = useRef(layouts);

  const expectLayoutChangeCall = prevLayouts.current !== layouts;

  prevLayouts.current = layouts;

  const onLayoutChange = useMemo(() => {
    let skipCall = expectLayoutChangeCall;
    return (nextLayouts: Layout[]) => {
      if (skipCall) {
        skipCall = false;
        return;
      }
      const itemsById = keyBy(items, (item) => item.id);

      const sortedLayouts = orderBy(nextLayouts, ['y', 'x']);

      const itemsInOrder = sortedLayouts.map((layout) => {
        return itemsById[layout.i];
      });

      itemCallbacksRef.current.onItemsChange(itemsInOrder);
    };
  }, [items, expectLayoutChangeCall]);

  const onResize: ItemCallback = useCallback(
    (layout) => {
      const itemsById = keyBy(items, (item) => item.id);

      const itemsAfterResize = layout.map((layoutItem) => {
        const gridItem = itemsById[layoutItem.i];

        return {
          ...gridItem,
          columns: Math.max(1, layoutItem.w),
          rows: Math.max(1, layoutItem.h),
        };
      });

      itemCallbacksRef.current.onItemsChange(itemsAfterResize);
    },

    [items]
  );

  return (
    <WithFixedWidth
      className={gridContainerClassName}
      layouts={layouts}
      breakpoints={theme.breakpoint}
      breakpoint={currentBreakpoint || EUI_BREAKPOINTS.xl}
      rowHeight={ROW_HEIGHT}
      cols={BREAKPOINT_COLUMNS}
      allowOverlap={false}
      onLayoutChange={onLayoutChange}
      onResizeStop={onResize}
      compactType="vertical"
      isBounded
      containerPadding={CONTAINER_PADDING}
      isDraggable={false}
      isDroppable={false}
    >
      {gridElements}
    </WithFixedWidth>
  );
}

export function InvestigateWidgetGrid({
  items,
  onItemsChange,
  onItemDelete,
  onItemCopy,
  onItemLockToggle,
  fadeLockedItems,
  onItemOverrideRemove,
  onItemTitleChange,
  onItemEditClick,
}: InvestigateWidgetGridProps) {
  const sections = useMemo<Section[]>(() => {
    let currentGrid: GridSection = { items: [] };
    const allSections: Section[] = [currentGrid];

    for (const item of items) {
      if (item.chrome === ChromeOption.disabled || item.chrome === ChromeOption.static) {
        const elementSection: SingleComponentSection = {
          item,
        };
        allSections.push(elementSection);
        currentGrid = { items: [] };
        allSections.push(currentGrid);
      } else {
        currentGrid.items.push(item);
      }
    }

    return allSections.filter((grid) => 'item' in grid || grid.items.length > 0);
  }, [items]);

  if (!sections.length) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {sections.map((section, index) => {
        if ('items' in section) {
          return (
            <EuiFlexItem key={index} grow={false}>
              <GridSectionRenderer
                items={section.items}
                onItemCopy={(copiedItem) => {
                  return onItemCopy(copiedItem);
                }}
                onItemDelete={(deletedItem) => {
                  return onItemDelete(deletedItem);
                }}
                onItemLockToggle={(toggledItem) => {
                  return onItemLockToggle(toggledItem);
                }}
                onItemsChange={(itemsInSection) => {
                  const nextItems = sections.flatMap((sectionAtIndex) => {
                    if ('item' in sectionAtIndex) {
                      return sectionAtIndex.item;
                    }
                    if (sectionAtIndex !== section) {
                      return sectionAtIndex.items;
                    }
                    return itemsInSection;
                  });

                  return onItemsChange(nextItems);
                }}
                onItemOverrideRemove={(item, override) => {
                  return onItemOverrideRemove(item, override);
                }}
                onItemTitleChange={(item, title) => {
                  return onItemTitleChange(item, title);
                }}
                onItemEditClick={(item) => {
                  return onItemEditClick(item);
                }}
                fadeLockedItems={fadeLockedItems}
              />
            </EuiFlexItem>
          );
        }
        return (
          <EuiFlexItem grow={false} key={index}>
            {section.item.chrome === ChromeOption.disabled ? (
              section.item.element
            ) : (
              <GridItem
                id={section.item.id}
                title={section.item.title}
                description={section.item.description}
                faded={section.item.locked && fadeLockedItems}
                loading={section.item.loading}
                locked={section.item.locked}
                overrides={section.item.overrides}
                onCopy={() => {
                  return onItemCopy(section.item);
                }}
                onDelete={() => {
                  return onItemDelete(section.item);
                }}
                onOverrideRemove={(override) => {
                  return onItemOverrideRemove(section.item, override);
                }}
                onTitleChange={(nextTitle) => {
                  return onItemTitleChange(section.item, nextTitle);
                }}
                onLockToggle={() => {
                  return onItemLockToggle(section.item);
                }}
                onEditClick={() => {
                  return onItemEditClick(section.item);
                }}
              >
                {section.item.element}
              </GridItem>
            )}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
