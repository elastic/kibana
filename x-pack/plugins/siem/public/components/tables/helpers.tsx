/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { DragEffects, DraggableWrapper } from '../drag_and_drop/draggable_wrapper';
import { Provider } from '../timeline/data_providers/provider';
import { defaultToEmptyTag, getEmptyTagValue } from '../empty_value';
import { MoreRowItems } from '../page';

export const getRowItemDraggable = ({
  rowItem,
  attrName,
  idPrefix,
  render,
}: {
  rowItem: string | null | undefined;
  attrName: string;
  idPrefix: string;
  render?: (item: string) => JSX.Element;
  displayCount?: number;
  maxOverflow?: number;
}): JSX.Element => {
  if (rowItem != null) {
    const id = escapeDataProviderId(`${idPrefix}-${attrName}-${rowItem}`);
    return (
      <DraggableWrapper
        key={id}
        dataProvider={{
          and: [],
          enabled: true,
          id,
          name: rowItem,
          excluded: false,
          kqlQuery: '',
          queryMatch: { field: attrName, value: rowItem },
        }}
        render={(dataProvider, _, snapshot) =>
          snapshot.isDragging ? (
            <DragEffects>
              <Provider dataProvider={dataProvider} />
            </DragEffects>
          ) : (
            <>{render ? render(rowItem) : rowItem}</>
          )
        }
      />
    );
  } else {
    return getEmptyTagValue();
  }
};

export const getRowItemDraggables = ({
  rowItems,
  attrName,
  idPrefix,
  render,
  displayCount = 5,
  maxOverflow = 5,
}: {
  rowItems: string[] | null | undefined;
  attrName: string;
  idPrefix: string;
  render?: (item: string) => JSX.Element;
  displayCount?: number;
  maxOverflow?: number;
}): JSX.Element => {
  if (rowItems != null && rowItems.length > 0) {
    const draggables = rowItems.slice(0, displayCount).map((rowItem, index) => {
      const id = escapeDataProviderId(`${idPrefix}-${attrName}-${rowItem}`);
      return (
        <React.Fragment key={id}>
          {index !== 0 ? <>,&nbsp;</> : null}
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: rowItem,
              excluded: false,
              kqlQuery: '',
              queryMatch: { field: attrName, value: rowItem },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <>{render ? render(rowItem) : rowItem}</>
              )
            }
          />
        </React.Fragment>
      );
    });

    return draggables.length > 0 ? (
      <>
        {draggables} {getRowItemOverflow(rowItems, idPrefix, displayCount, maxOverflow)}
      </>
    ) : (
      getEmptyTagValue()
    );
  } else {
    return getEmptyTagValue();
  }
};

export const getRowItemOverflow = (
  rowItems: string[],
  idPrefix: string,
  overflowIndexStart = 5,
  maxOverflowItems = 5
): JSX.Element => {
  return (
    <>
      {rowItems.length > overflowIndexStart && (
        <EuiToolTip
          content={
            <>
              {rowItems
                .slice(overflowIndexStart, overflowIndexStart + maxOverflowItems)
                .map(rowItem => (
                  <span key={`${idPrefix}-${rowItem}`}>
                    {defaultToEmptyTag(rowItem)}
                    <br />
                  </span>
                ))}
              {rowItems.length > overflowIndexStart + maxOverflowItems && (
                <b>
                  <br />
                  <FormattedMessage
                    id="xpack.siem.tables.rowItemHelper.moreDescription"
                    defaultMessage="More..."
                  />
                </b>
              )}
            </>
          }
        >
          <MoreRowItems type="boxesHorizontal" />
        </EuiToolTip>
      )}
    </>
  );
};
