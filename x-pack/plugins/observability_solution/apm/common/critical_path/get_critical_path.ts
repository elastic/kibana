/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IWaterfall,
  IWaterfallSpanOrTransaction,
} from '../../public/components/app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';
import { CriticalPath, CriticalPathSegment } from './types';

export function getCriticalPath(waterfall: IWaterfall): CriticalPath {
  const segments: CriticalPathSegment[] = [];

  function scan({
    item,
    start,
    end,
  }: {
    item: IWaterfallSpanOrTransaction;
    start: number;
    end: number;
  }): void {
    segments.push({
      self: false,
      duration: end - start,
      item,
      offset: start,
    });
    const directChildren = waterfall.childrenByParentId[item.id];

    if (directChildren && directChildren.length > 0) {
      // We iterate over all the item's direct children. The one that
      // ends last is the first item in the array.
      const orderedChildren = directChildren.concat().sort((a, b) => {
        const endTimeA = a.offset + a.skew + a.duration;
        const endTimeB = b.offset + b.skew + b.duration;
        if (endTimeA === endTimeB) {
          return 0;
        }
        return endTimeB > endTimeA ? 1 : -1;
      });

      // For each point in time, determine what child is on the critical path.
      // We start scanning at the end. Once we've decided what the child on the
      // critical path is, scan its children, from the start time of that span
      // until the end. The next scan time is the start time of the child that was
      // on the critical path.
      let scanTime = end;

      orderedChildren.forEach((child) => {
        const normalizedChildStart = Math.max(child.offset + child.skew, start);
        const childEnd = child.offset + child.skew + child.duration;

        // if a span ends before the current scan time, use the current
        // scan time as when the child ended. We don't want to scan further
        // than the scan time. This prevents overlap in the critical path.
        const normalizedChildEnd = Math.min(childEnd, scanTime);

        const isOnCriticalPath = !(
          // A span/tx is NOT on the critical path if:
          // - The start time is equal to or greater than the current scan time.
          // Otherwise, spans that started at the same time will all contribute to
          // the critical path, but we only want one to contribute.
          // - The span/tx ends before the start of the initial scan period.
          // - The span ends _after_ the current scan time.

          (normalizedChildStart >= scanTime || normalizedChildEnd < start || childEnd > scanTime)
        );

        if (!isOnCriticalPath) {
          return;
        }

        if (normalizedChildEnd < scanTime - 1000) {
          // This span is on the critical path, but it ended before the scan time.
          // This means that there is a gap, so we add a segment to the critical path
          // for the _parent_. There's a slight offset because we don't want really small
          // segments that can be reasonably attributed to clock skew.
          segments.push({
            item,
            duration: scanTime - normalizedChildEnd,
            offset: normalizedChildEnd,
            self: true,
          });
        }

        // scan this child for the period we're considering it to be on the critical path
        scan({
          start: normalizedChildStart,
          end: childEnd,
          item: child,
        });

        // set the scan time to the start of the span, and scan the next child
        scanTime = normalizedChildStart;
      });

      // there's an unattributed gap at the start, so add a segment for the parent as well
      if (scanTime > start) {
        segments.push({
          item,
          offset: start,
          duration: scanTime - start,
          self: true,
        });
      }
    } else {
      // for the entire scan period, add this item to the critical path
      segments.push({
        item,
        offset: start,
        duration: end - start,
        self: true,
      });
    }
  }

  if (waterfall.entryWaterfallTransaction) {
    const start =
      waterfall.entryWaterfallTransaction.skew + waterfall.entryWaterfallTransaction.offset;
    scan({
      item: waterfall.entryWaterfallTransaction,
      start,
      end: start + waterfall.entryWaterfallTransaction.duration,
    });
  }

  return { segments };
}
