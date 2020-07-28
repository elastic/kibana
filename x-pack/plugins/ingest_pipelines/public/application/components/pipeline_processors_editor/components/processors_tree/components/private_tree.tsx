/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, MutableRefObject, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AutoSizer, List, WindowScroller } from 'react-virtualized';

import { DropSpecialLocations } from '../../../constants';
import { ProcessorInternal, ProcessorSelector } from '../../../types';
import { isChildPath } from '../../../processors_reducer';
import { selectorToDataTestSubject } from '../../../utils';

import { DropZoneButton } from '.';
import { TreeNode } from '.';
import { calculateItemHeight } from '../utils';
import { OnActionHandler, ProcessorInfo } from '../processors_tree';

export interface PrivateProps {
  processors: ProcessorInternal[];
  selector: ProcessorSelector;
  onAction: OnActionHandler;
  level: number;
  movingProcessor?: ProcessorInfo;
  // Only passed into the top level list
  windowScrollerRef?: MutableRefObject<WindowScroller | null>;
  listRef?: MutableRefObject<List | null>;
}

const isDropZoneAboveDisabled = (processor: ProcessorInfo, selectedProcessor: ProcessorInfo) => {
  return Boolean(
    // Is the selected node first in a list?
    (!selectedProcessor.aboveId && selectedProcessor.id === processor.id) ||
      isChildPath(selectedProcessor.selector, processor.selector)
  );
};

const isDropZoneBelowDisabled = (processor: ProcessorInfo, selectedProcessor: ProcessorInfo) => {
  return (
    processor.id === selectedProcessor.id ||
    processor.belowId === selectedProcessor.id ||
    isChildPath(selectedProcessor.selector, processor.selector)
  );
};

/**
 * Recursively rendering tree component for ingest pipeline processors.
 *
 * Note: this tree should start at level 1. It is the only level at
 * which we render the optimised virtual component. This gives a
 * massive performance boost to this component which can get very tall.
 *
 * The first level list also contains the outside click listener which
 * enables users to click outside of the tree and cancel moving a
 * processor.
 */
export const PrivateTree: FunctionComponent<PrivateProps> = ({
  processors,
  selector,
  movingProcessor,
  onAction,
  level,
  windowScrollerRef,
  listRef,
}) => {
  const renderRow = ({
    idx,
    info,
    processor,
  }: {
    idx: number;
    info: ProcessorInfo;
    processor: ProcessorInternal;
  }) => {
    const stringifiedSelector = selectorToDataTestSubject(info.selector);
    return (
      <>
        {idx === 0 ? (
          <EuiFlexItem>
            <DropZoneButton
              data-test-subj={`dropButtonAbove-${stringifiedSelector}`}
              onClick={(event) => {
                event.preventDefault();
                onAction({
                  type: 'move',
                  payload: {
                    destination: selector.concat(DropSpecialLocations.top),
                    source: movingProcessor!.selector,
                  },
                });
              }}
              isVisible={Boolean(movingProcessor)}
              isDisabled={!movingProcessor || isDropZoneAboveDisabled(info, movingProcessor)}
            />
          </EuiFlexItem>
        ) : undefined}
        <EuiFlexItem>
          <TreeNode
            level={level}
            processor={processor}
            processorInfo={info}
            onAction={onAction}
            movingProcessor={movingProcessor}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <DropZoneButton
            data-test-subj={`dropButtonBelow-${stringifiedSelector}`}
            isVisible={Boolean(movingProcessor)}
            isDisabled={!movingProcessor || isDropZoneBelowDisabled(info, movingProcessor)}
            onClick={(event) => {
              event.preventDefault();
              onAction({
                type: 'move',
                payload: {
                  destination: selector.concat(String(idx + 1)),
                  source: movingProcessor!.selector,
                },
              });
            }}
          />
        </EuiFlexItem>
      </>
    );
  };

  useEffect(() => {
    if (windowScrollerRef && windowScrollerRef.current) {
      windowScrollerRef.current.updatePosition();
    }
    if (listRef && listRef.current) {
      listRef.current.recomputeRowHeights();
    }
  }, [processors, listRef, windowScrollerRef, movingProcessor]);

  // A list optimized to handle very many items.
  const renderVirtualList = () => {
    return (
      <WindowScroller ref={windowScrollerRef} scrollElement={window}>
        {({ height, registerChild, isScrolling, onChildScroll, scrollTop }: any) => {
          return (
            <EuiFlexGroup direction="column" responsive={false} gutterSize="none">
              <AutoSizer disableHeight>
                {({ width }) => {
                  return (
                    <div ref={registerChild}>
                      <List
                        ref={listRef}
                        autoHeight
                        height={height}
                        width={width}
                        overScanRowCount={5}
                        isScrolling={isScrolling}
                        onChildScroll={onChildScroll}
                        scrollTop={scrollTop}
                        rowCount={processors.length}
                        rowHeight={({ index }) => {
                          const processor = processors[index];
                          return calculateItemHeight({
                            processor,
                            isFirstInArray: index === 0,
                          });
                        }}
                        rowRenderer={({ index: idx, style }) => {
                          const processor = processors[idx];
                          const above = processors[idx - 1];
                          const below = processors[idx + 1];
                          const info: ProcessorInfo = {
                            id: processor.id,
                            selector: selector.concat(String(idx)),
                            aboveId: above?.id,
                            belowId: below?.id,
                          };

                          return (
                            <div style={style} key={processor.id}>
                              {renderRow({ processor, info, idx })}
                            </div>
                          );
                        }}
                        processors={processors}
                      />
                    </div>
                  );
                }}
              </AutoSizer>
            </EuiFlexGroup>
          );
        }}
      </WindowScroller>
    );
  };

  if (level === 1) {
    // Only render the optimised list for the top level list because that is the list
    // that will almost certainly be the tallest
    return renderVirtualList();
  }

  return (
    <EuiFlexGroup direction="column" responsive={false} gutterSize="none">
      {processors.map((processor, idx) => {
        const above = processors[idx - 1];
        const below = processors[idx + 1];
        const info: ProcessorInfo = {
          id: processor.id,
          selector: selector.concat(String(idx)),
          aboveId: above?.id,
          belowId: below?.id,
        };

        return <div key={processor.id}>{renderRow({ processor, idx, info })}</div>;
      })}
    </EuiFlexGroup>
  );
};
