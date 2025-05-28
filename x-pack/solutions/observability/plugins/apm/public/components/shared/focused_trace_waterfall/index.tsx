/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import type { WaterfallSpan, WaterfallTransaction } from '../../../../common/waterfall/typings';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import type {
  IWaterfallSpan,
  IWaterfallTransaction,
} from '../../app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';
import {
  generateLegendsAndAssignColorsToWaterfall,
  getSpanItem,
  getTransactionItem,
} from '../../app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';
import { WaterfallItem } from '../../app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_item';
import { TimelineAxisContainer, VerticalLinesContainer } from '../charts/timeline';
import { TraceSummary } from './trace_summary';

type FocusedTrace = APIReturnType<'GET /internal/apm/traces/{traceId}/{docId}'>;

interface Props {
  items: FocusedTrace;
  isEmbeddable?: boolean;
}

const margin = {
  top: 40,
  left: 20,
  right: 50,
  bottom: 0,
};

function convertChildrenToWatefallItem(
  children: NonNullable<FocusedTrace['traceItems']>['focusedTraceTree'],
  rootWaterfallTransaction: IWaterfallTransaction
) {
  function convert(
    child: NonNullable<FocusedTrace['traceItems']>['focusedTraceTree'][0]
  ): Array<IWaterfallTransaction | IWaterfallSpan> {
    const waterfallItem =
      child.traceDoc.processor.event === 'transaction'
        ? getTransactionItem(child.traceDoc as WaterfallTransaction, 0)
        : getSpanItem(child.traceDoc as WaterfallSpan, 0);

    waterfallItem.offset = calculateOffset({ item: waterfallItem, rootWaterfallTransaction });

    const convertedChildren = child.children?.length ? child.children.flatMap(convert) : [];

    return [waterfallItem, ...convertedChildren];
  }

  return children.flatMap(convert);
}

const calculateOffset = ({
  item,
  rootWaterfallTransaction,
}: {
  item: IWaterfallTransaction | IWaterfallSpan;
  rootWaterfallTransaction: IWaterfallTransaction;
}) => item.doc.timestamp.us - rootWaterfallTransaction.doc.timestamp.us;

export function FocusedTraceWaterfall({ items, isEmbeddable = false }: Props) {
  const { euiTheme } = useEuiTheme();

  const traceItems = items.traceItems;

  const waterfall: {
    items: Array<IWaterfallTransaction | IWaterfallSpan>;
    totalDuration: number;
    focusedItemId?: string;
  } = useMemo(() => {
    const waterfallItems: Array<IWaterfallTransaction | IWaterfallSpan> = [];

    if (!traceItems) {
      return {
        items: [],
        totalDuration: 0,
        focusedItemId: undefined,
      };
    }

    const rootWaterfallTransaction = getTransactionItem(
      traceItems.rootTransaction as WaterfallTransaction,
      0
    );

    waterfallItems.push(rootWaterfallTransaction);

    const parentItem = traceItems.parentDoc
      ? traceItems.parentDoc.processor.event === 'transaction'
        ? getTransactionItem(traceItems.parentDoc as WaterfallTransaction, 0)
        : getSpanItem(traceItems.parentDoc as WaterfallSpan, 0)
      : undefined;

    if (parentItem && parentItem.id !== rootWaterfallTransaction.id) {
      parentItem.offset = calculateOffset({ item: parentItem, rootWaterfallTransaction });
      waterfallItems.push(parentItem);
    }

    const focusedItem =
      traceItems.focusedTraceDoc.processor.event === 'transaction'
        ? getTransactionItem(traceItems.focusedTraceDoc as WaterfallTransaction, 0)
        : getSpanItem(traceItems.focusedTraceDoc as WaterfallSpan, 0);

    focusedItem.offset = calculateOffset({ item: focusedItem, rootWaterfallTransaction });

    if (focusedItem.id !== rootWaterfallTransaction.id) {
      waterfallItems.push(focusedItem);
    }

    const focusedItemChildren = convertChildrenToWatefallItem(
      traceItems.focusedTraceTree,
      rootWaterfallTransaction
    );

    waterfallItems.push(...focusedItemChildren);
    generateLegendsAndAssignColorsToWaterfall(waterfallItems);

    return {
      items: waterfallItems,
      totalDuration: rootWaterfallTransaction.duration,
      focusedItemId: focusedItem.id,
    };
  }, [traceItems]);

  if (!waterfall.items.length) {
    return null;
  }

  return (
    <>
      <div
        css={css`
          position: relative;
        `}
      >
        <div
          css={css`
            display: flex;
            position: sticky;
            top: var(--euiFixedHeadersOffset, 0);
            z-index: ${euiTheme.levels.menu};
            background-color: ${euiTheme.colors.emptyShade};
            border-bottom: ${euiTheme.border.thin};
          `}
        >
          <TimelineAxisContainer
            xMax={waterfall.totalDuration}
            margins={margin}
            numberOfTicks={3}
          />
        </div>
        <VerticalLinesContainer xMax={waterfall.totalDuration} margins={margin} />
        {waterfall.items.map((item) => (
          <WaterfallItem
            key={item.id}
            timelineMargins={margin}
            color={item.color}
            hasToggle={false}
            errorCount={0}
            isSelected={item.id === waterfall.focusedItemId}
            item={item}
            marginLeftLevel={0}
            totalDuration={waterfall.totalDuration}
            isEmbeddable={isEmbeddable}
          />
        ))}
      </div>
      <EuiSpacer />
      <TraceSummary summary={items.summary} />
    </>
  );
}
