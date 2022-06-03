/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, MutableRefObject, useEffect, useMemo } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { useVirtual } from 'react-virtual';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

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
}) => {
  const parentRef = React.useRef();

  const rowVirtualizer = useVirtual({
    size: processors.length,
    parentRef,
    estimateSize: React.useCallback(
      (index) => {
        const processor = processors[index];
        return calculateItemHeight({
          processor,
          isFirstInArray: index === 0,
        });
      },
      [processors]
    ),
  });

  const selectors: string[][] = useMemo(() => {
    return processors.map((_, idx) => selector.concat(String(idx)));
  }, [processors, selector]);

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
        ) : undefined}
        <TreeNode
          level={level}
          processor={processor}
          processorInfo={info}
          onAction={onAction}
          movingProcessor={movingProcessor}
        />
        <DropZoneButton
          compressed={level === 1 && idx + 1 === processors.length}
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
      </>
    );
  };

  console.error('assds');

  const renderVirtualList = () => {
    return (
      <div
        ref={parentRef}
        className="List"
        style={{
          height: `auto`,
          width: `100%`,
          overflow: 'auto',
        }}
      >
        <div
          style={{
            height: rowVirtualizer.totalSize,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.virtualItems.map((virtualRow) => {
            const idx = virtualRow.index;
            const processor = processors[idx];
            const above = processors[idx - 1];
            const below = processors[idx + 1];
            const info: ProcessorInfo = {
              id: processor.id,
              selector: selectors[idx],
              aboveId: above?.id,
              belowId: below?.id,
            };

            return (
              <div
                key={virtualRow.index}
                ref={virtualRow.measureRef}
                className={virtualRow.index % 2 ? 'ListItemOdd' : 'ListItemEven'}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div style={{ height: processors[virtualRow.index] }}>
                  {renderRow({ processor, info, idx })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // A list optimized to handle very many items.
  // const renderVirtualList = () => {
  //   return (
  //     // <WindowScroller ref={windowScrollerRef} scrollElement={window}>
  //     //   {({ height, registerChild, isScrolling, onChildScroll, scrollTop }: any) => {
  //     //     return (
  //     // <AutoSizer disableHeight>
  //     //   {({ width }) => {
  //     // return (
  //     <div
  //       style={{ width: '100%' }}
  //       // ref={registerChild}
  //     >
  //       <List
  //         ref={listRef}
  //         // autoHeight
  //         // height={height}
  //         // width={width}
  //         overScanRowCount={5}
  //         // isScrolling={isScrolling}
  //         // onChildScroll={onChildScroll}
  //         // scrollTop={scrollTop}
  //         rowCount={processors.length}
  //         rowHeight={({ index }) => {
  //           const processor = processors[index];
  //           return calculateItemHeight({
  //             processor,
  //             isFirstInArray: index === 0,
  //           });
  //         }}
  //         rowRenderer={({ index: idx, style }) => {
  //           const processor = processors[idx];
  //           const above = processors[idx - 1];
  //           const below = processors[idx + 1];
  //           const info: ProcessorInfo = {
  //             id: processor.id,
  //             selector: selectors[idx],
  //             aboveId: above?.id,
  //             belowId: below?.id,
  //           };

  //           return (
  //             <div style={style} key={processor.id}>
  //               {renderRow({ processor, info, idx })}
  //             </div>
  //           );
  //         }}
  //         processors={processors}
  //       />
  //     </div>
  //     //     );
  //     //   }}
  //     // </AutoSizer>
  //     //     );
  //     //   }}
  //     // </WindowScroller>
  //   );
  // };

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
