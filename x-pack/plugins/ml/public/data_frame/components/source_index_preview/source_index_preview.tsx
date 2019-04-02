/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect, useState } from 'react';

import { SearchResponse } from 'elasticsearch';

import { StaticIndexPattern } from 'ui/index_patterns';

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckbox,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPopover,
  EuiPopoverTitle,
  EuiProgress,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

import { ml } from '../../../services/ml_api_service';

import { Dictionary } from '../../../../common/types/common';

import { SimpleQuery } from '../../common';

import {
  EsDoc,
  EsFieldName,
  getDefaultSelectableFields,
  getSelectableFields,
  MAX_COLUMNS,
  toggleSelectedField,
} from './common';
import { ExpandedRow } from './expanded_row';

type ItemIdToExpandedRowMap = Dictionary<JSX.Element>;

interface Props {
  indexPattern: StaticIndexPattern;
  query: SimpleQuery;
  cellClick?(search: string): void;
}

const SEARCH_SIZE = 1000;

export const SourceIndexPreview: React.SFC<Props> = React.memo(
  ({ cellClick, indexPattern, query }) => {
    const [loading, setLoading] = useState(false);

    const [tableItems, setTableItems] = useState([] as EsDoc[]);
    const [selectedFields, setSelectedFields] = useState([] as EsFieldName[]);
    const [isColumnsPopoverVisible, setColumnsPopoverVisible] = useState(false);

    function toggleColumnsPopover() {
      setColumnsPopoverVisible(!isColumnsPopoverVisible);
    }

    function closeColumnsPopover() {
      setColumnsPopoverVisible(false);
    }

    function toggleColumn(column: EsFieldName) {
      // spread to a new array otherwise the component wouldn't re-render
      setSelectedFields([...toggleSelectedField(selectedFields, column)]);
    }

    let docFields: EsFieldName[] = [];
    let docFieldsCount = 0;
    if (tableItems.length > 0) {
      docFields = getSelectableFields(tableItems);
      docFields.sort();
      docFieldsCount = docFields.length;
    }

    const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState(
      {} as ItemIdToExpandedRowMap
    );

    function toggleDetails(item: EsDoc) {
      if (itemIdToExpandedRowMap[item._id]) {
        delete itemIdToExpandedRowMap[item._id];
      } else {
        itemIdToExpandedRowMap[item._id] = <ExpandedRow item={item} />;
      }
      // spread to a new object otherwise the component wouldn't re-render
      setItemIdToExpandedRowMap({ ...itemIdToExpandedRowMap });
    }

    useEffect(
      () => {
        setLoading(true);

        ml.esSearch({
          index: indexPattern.title,
          rest_total_hits_as_int: true,
          size: SEARCH_SIZE,
          body: query,
        })
          .then((resp: SearchResponse<any>) => {
            const docs = resp.hits.hits;

            if (selectedFields.length === 0) {
              const newSelectedFields = getDefaultSelectableFields(docs);
              setSelectedFields(newSelectedFields);
            }

            setTableItems(docs as EsDoc[]);
            setLoading(false);
          })
          .catch((resp: any) => {
            setTableItems([] as EsDoc[]);
            setLoading(false);
          });
      },
      [indexPattern.title, JSON.stringify(query)]
    );

    const columns = selectedFields.map(k => {
      const column = {
        field: `_source.${k}`,
        name: k,
        render: undefined,
        sortable: true,
        truncateText: true,
      } as Dictionary<any>;

      if (cellClick) {
        column.render = (d: string) => (
          <EuiButtonEmpty size="xs" onClick={() => cellClick(`${k}:(${d})`)}>
            {d}
          </EuiButtonEmpty>
        );
      }

      return column;
    });

    if (docFieldsCount > MAX_COLUMNS) {
      columns.unshift({
        align: RIGHT_ALIGNMENT,
        width: '40px',
        isExpander: true,
        render: (item: EsDoc) => (
          <EuiButtonIcon
            onClick={() => toggleDetails(item)}
            aria-label={itemIdToExpandedRowMap[item._id] ? 'Collapse' : 'Expand'}
            iconType={itemIdToExpandedRowMap[item._id] ? 'arrowUp' : 'arrowDown'}
          />
        ),
      });
    }

    if (tableItems.length === 0) {
      return (
        <EuiEmptyPrompt title={<h2>No results</h2>} body={<p>Check the syntax of your query.</p>} />
      );
    }

    return (
      <Fragment>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <h3>Source Index {indexPattern.title}</h3>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiFlexItem>
                {docFieldsCount > MAX_COLUMNS && (
                  <span>
                    showing {selectedFields.length} of {docFieldsCount} fields
                  </span>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiPopover
                  id="popover"
                  button={
                    <EuiButtonIcon
                      iconType="gear"
                      onClick={toggleColumnsPopover}
                      aria-label="Select columns"
                    />
                  }
                  isOpen={isColumnsPopoverVisible}
                  closePopover={closeColumnsPopover}
                  ownFocus
                >
                  <EuiPopoverTitle>Select Fields</EuiPopoverTitle>
                  <div style={{ maxHeight: '400px', overflowY: 'scroll' }}>
                    {docFields.map(d => (
                      <EuiCheckbox
                        key={d}
                        id={d}
                        label={d}
                        checked={selectedFields.includes(d)}
                        onChange={() => toggleColumn(d)}
                        disabled={selectedFields.includes(d) && selectedFields.length === 1}
                      />
                    ))}
                  </div>
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {loading && <EuiProgress size="xs" color="accent" />}
        {!loading && <EuiProgress size="xs" color="accent" max={1} value={0} />}
        <EuiInMemoryTable
          items={tableItems}
          columns={columns}
          pagination={true}
          hasActions={false}
          isSelectable={false}
          itemId="_id"
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          isExpandable={true}
        />
      </Fragment>
    );
  }
);
