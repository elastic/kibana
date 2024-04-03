/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGrid, EuiFlexItem, EuiSpacer, EuiText, EuiAutoSizer } from '@elastic/eui';
import { VariableSizeList as List } from 'react-window';
import { FormattedMessage } from '@kbn/i18n-react';
import { WindowScroller } from 'react-virtualized';

import { Loading } from '../../../../components';
import type { IntegrationCardItem } from '../../screens/home';

import { PackageCard } from '../package_card';

interface GridColumnProps {
  list: IntegrationCardItem[];
  isLoading: boolean;
  showMissingIntegrationMessage?: boolean;
  showCardLabels?: boolean;
}

const VirtualizedRow: React.FC<{
  index: number;
  onHeightChange: (index: number, size: number) => void;
  style: any;
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

export const GridColumn = ({
  list,
  showMissingIntegrationMessage = false,
  showCardLabels = false,
  isLoading,
}: GridColumnProps) => {
  const itemsSizeRefs = useRef(new Map<number, number>());
  const listRef = useRef<List>(null);

  const onHeightChange = useCallback((index: number, size: number) => {
    itemsSizeRefs.current.set(index, size);
    if (listRef.current) {
      listRef.current.resetAfterIndex(index);
    }
  }, []);

  if (isLoading) return <Loading />;

  if (!list.length) {
    return (
      <EuiFlexGrid gutterSize="l" columns={3}>
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
      >
        {() => (
          <EuiAutoSizer disableHeight>
            {({ width }: { width: number }) => (
              <List
                style={{ height: '100%' }}
                ref={listRef}
                layout="vertical"
                itemCount={Math.ceil(list.length / 3)}
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
                    <VirtualizedRow index={index} style={style} onHeightChange={onHeightChange}>
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
