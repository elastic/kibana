/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AutoSizer, List, WindowScroller } from 'react-virtualized';

import { DropSpecialLocations } from '../../../constants';
import { ProcessorInternal, ProcessorSelector } from '../../../types';
import { isChildPath } from '../../../processors_reducer';

import { DropZoneButton } from '.';
import { TreeNode } from '.';
import { calculateItemHeight } from '../utils';
import { TreeMode, Action, ProcessorInfo } from '../processors_tree';

export type PrivateAction =
  | Action
  | {
      type: 'selectToMove';
      payload: ProcessorInfo;
    }
  | {
      type: 'cancelMove';
    };

export type PrivateOnActionHandler = (args: PrivateAction) => void;

export interface PrivateProps {
  processors: ProcessorInternal[];
  selector: ProcessorSelector;
  privateOnAction: PrivateOnActionHandler;
  mode: TreeMode;
  selectedProcessorInfo?: ProcessorInfo;
  level: number;
  // Only passed into the top level list
  onHeightChange?: () => void;
  windowScrollerRef?: any;
  listRef?: any;
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
 * Note: this tree should start at level 1 and it is the only level at
 * which we render the optimised virtual component. This gives a
 * massive performance boost to this component which can get very tall.
 */
export const PrivateTree: FunctionComponent<PrivateProps> = ({
  processors,
  selector,
  selectedProcessorInfo,
  privateOnAction,
  mode,
  level,
  windowScrollerRef,
  listRef,
  onHeightChange,
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
    return (
      <>
        {idx === 0 ? (
          <DropZoneButton
            onClick={() => {
              privateOnAction({
                type: 'move',
                payload: {
                  destination: selector.concat(DropSpecialLocations.top),
                  source: selectedProcessorInfo!.selector,
                },
              });
            }}
            isDisabled={mode !== 'move' || isDropZoneAboveDisabled(info, selectedProcessorInfo!)}
          />
        ) : undefined}
        <EuiFlexItem>
          <TreeNode
            level={level}
            mode={mode}
            processor={processor}
            processorInfo={info}
            privateOnAction={privateOnAction}
            selectedProcessorInfo={selectedProcessorInfo}
          />
        </EuiFlexItem>
        <DropZoneButton
          isDisabled={mode !== 'move' || isDropZoneBelowDisabled(info, selectedProcessorInfo!)}
          onClick={() => {
            privateOnAction({
              type: 'move',
              payload: {
                destination: selector.concat(String(idx + 1)),
                source: selectedProcessorInfo!.selector,
              },
            });
          }}
        />
      </>
    );
  };

  useEffect(() => {
    if (onHeightChange) {
      onHeightChange();
    }
    if (listRef?.current) {
      listRef.current.recomputeRowHeights();
    }
  }, [processors, onHeightChange, listRef]);

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
                          return calculateItemHeight({
                            processor: processors[index],
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
