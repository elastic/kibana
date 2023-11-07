/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Dispatch, SetStateAction, MouseEvent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon } from '@elastic/eui';
import { Ping } from '../../../../../../../../common/runtime_types';
import { PingListExpandedRowComponent } from '../expanded_row';
type PingExpandedRowMap = Record<string, JSX.Element>;

export const toggleDetails = (
  ping: Ping,
  expandedRows: PingExpandedRowMap,
  setExpandedRows: Dispatch<SetStateAction<PingExpandedRowMap>>
) => {
  // prevent expanding on row click if not expandable
  if (!rowShouldExpand(ping)) {
    return;
  }

  // If already expanded, collapse
  if (expandedRows[ping.docId]) {
    delete expandedRows[ping.docId];
    setExpandedRows({ ...expandedRows });
    return;
  }

  // Otherwise expand this row
  setExpandedRows({
    ...expandedRows,
    [ping.docId]: <PingListExpandedRowComponent ping={ping} />,
  });
};

export function rowShouldExpand(item: Ping) {
  const errorPresent = !!item.error;
  const httpBodyPresent = item.http?.response?.body?.bytes ?? 0 > 0;
  return (
    errorPresent ||
    httpBodyPresent ||
    item?.http?.response?.headers ||
    item?.http?.response?.redirects
  );
}

interface Props {
  item: Ping;
  expandedRows: PingExpandedRowMap;
  setExpandedRows: Dispatch<SetStateAction<PingExpandedRowMap>>;
}
export const ExpandRowColumn = ({ item, expandedRows, setExpandedRows }: Props) => {
  return (
    <EuiButtonIcon
      data-test-subj="uptimePingListExpandBtn"
      onClick={(evt: MouseEvent<HTMLButtonElement>) => {
        // for table row click
        evt.stopPropagation();
        toggleDetails(item, expandedRows, setExpandedRows);
      }}
      isDisabled={!rowShouldExpand(item)}
      aria-label={
        expandedRows[item.docId]
          ? i18n.translate('xpack.synthetics.pingList.collapseRow', {
              defaultMessage: 'Collapse',
            })
          : i18n.translate('xpack.synthetics.pingList.expandRow', { defaultMessage: 'Expand' })
      }
      iconType={expandedRows[item.docId] ? 'arrowUp' : 'arrowDown'}
    />
  );
};
