/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useEffect, forwardRef } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiAutoSizer,
  EuiSkeletonRectangle,
} from '@elastic/eui';
import { VariableSizeList as List } from 'react-window';
import { FormattedMessage } from '@kbn/i18n-react';
import { WindowScroller } from 'react-virtualized';

import type { IntegrationCardItem } from '../../screens/home';

import { PackageCard } from '../package_card';

interface GridColumnProps {
  list: IntegrationCardItem[];
  isLoading: boolean;
  showMissingIntegrationMessage?: boolean;
  showCardLabels?: boolean;
  scrollElementId?: string;
  emptyStateStyles?: Record<string, string>;
}

const VirtualizedRow: React.FC<{
  index: number;
  onHeightChange: (index: number, size: number) => void;
  style: any;
  children: React.ReactNode;
}> = ({ index, children, style, onHeightChange }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      onHeightChange(index, ref.current.clientHeight);
    }
  }, [index, onHeightChange]);

  return (
    <div style={style}>
      <div ref={ref}>
        {children}
        <EuiSpacer size="m" />
      </div>
    </div>
  );
};

const CARD_OFFSET = 16;

export const GridColumn = ({
  list,
  showMissingIntegrationMessage = false,
  showCardLabels = false,
  isLoading,
  scrollElementId,
  emptyStateStyles,
}: GridColumnProps) => {
  const itemsSizeRefs = useRef(new Map<number, number>());
  const listRef = useRef<List>(null);
  const onHeightChange = useCallback((index: number, size: number) => {
    itemsSizeRefs.current.set(index, size);
    if (listRef.current) {
      listRef.current.resetAfterIndex(index);
    }
  }, []);

  if (isLoading) {
    return (
      <EuiFlexGrid gutterSize="l" columns={3}>
        {Array.from({ length: 12 }).map((_, index) => (
          <EuiFlexItem key={index} grow={3}>
            <EuiSkeletonRectangle height="160px" width="100%" />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    );
  }

  if (!list.length) {
    return (
      <EuiFlexGrid gutterSize="l" columns={3} data-test-subj="emptyState" style={emptyStateStyles}>
        <EuiFlexItem grow={3}>
          <EuiText>
            <p>
              {showMissingIntegrationMessage ? (
                <FormattedMessage
                  id="xpack.fleet.epmList.missingIntegrationPlaceholder"
                  defaultMessage="We didn't find any integrations matching your search term. Please try another keyword or browse using the categories on the left."
                />
              ) : (
                <FormattedMessage
                  id="xpack.fleet.epmList.noPackagesFoundPlaceholder"
                  defaultMessage="No integrations found"
                />
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGrid>
    );
  }

  return (
    <>
      <WindowScroller
        onScroll={({ scrollTop }) => {
          if (listRef.current) {
            listRef.current.scrollTo(scrollTop);
          }
        }}
        scrollElement={
          scrollElementId ? document.getElementById(scrollElementId) ?? undefined : undefined
        }
      >
        {() => (
          <EuiAutoSizer disableHeight>
            {({ width }: { width: number }) => (
              <List
                style={{ height: '100%', overflow: 'visible' }}
                ref={listRef}
                layout="vertical"
                itemCount={Math.ceil(list.length / 3)}
                innerElementType={forwardRef(({ style, children, ...rest }, ref) => (
                  <div
                    ref={ref}
                    // provides extra padding to the top and bottom of the list to prevent clipping and other strange behavior.
                    // for more info see: https://github.com/bvaughn/react-window?tab=readme-ov-file#can-i-add-padding-to-the-top-and-bottom-of-a-list
                    style={{ ...style, height: `${parseFloat(style.height) + CARD_OFFSET * 2}px` }}
                    {...rest}
                  >
                    {children}
                  </div>
                ))}
                itemSize={(index) => {
                  const test = itemsSizeRefs.current.get(index) ?? 200;

                  return test;
                }}
                height={window.innerHeight} // plus Don't see an integration message
                estimatedItemSize={200}
                width={width}
              >
                {({ index, style }) => {
                  return (
                    <VirtualizedRow
                      index={index}
                      // this is necessary to prevent clipping of the first row during animaiton, or if the cards have a badge.
                      // for more info see: https://github.com/bvaughn/react-window?tab=readme-ov-file#can-i-add-padding-to-the-top-and-bottom-of-a-list
                      style={{ ...style, top: `${(Number(style.top) ?? 0) + CARD_OFFSET}px` }}
                      onHeightChange={onHeightChange}
                    >
                      <EuiFlexGrid gutterSize="l" columns={3}>
                        {list.slice(index * 3, index * 3 + 3).map((item) => {
                          return (
                            <EuiFlexItem
                              key={item.id}
                              // Ensure that cards wrapped in EuiTours/EuiPopovers correctly inherit the full grid row height
                              css={css`
                                & > .euiPopover,
                                & > .euiPopover > .euiCard {
                                  height: 100%;
                                }
                              `}
                            >
                              <PackageCard {...item} showLabels={showCardLabels} />
                            </EuiFlexItem>
                          );
                        })}
                      </EuiFlexGrid>
                    </VirtualizedRow>
                  );
                }}
              </List>
            )}
          </EuiAutoSizer>
        )}
      </WindowScroller>
    </>
  );
};
