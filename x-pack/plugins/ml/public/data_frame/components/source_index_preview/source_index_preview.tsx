/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useContext, useState } from 'react';
import moment from 'moment-timezone';

import { i18n } from '@kbn/i18n';

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiCheckbox,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiProgress,
  EuiText,
  EuiTitle,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

// TODO EUI's types for EuiInMemoryTable is missing these props
interface ExpandableTableProps extends EuiInMemoryTableProps {
  compressed: boolean;
  itemIdToExpandedRowMap: ItemIdToExpandedRowMap;
  isExpandable: boolean;
}

const ExpandableTable = (EuiInMemoryTable as any) as FunctionComponent<ExpandableTableProps>;

import { KBN_FIELD_TYPES } from '../../../../common/constants/field_types';
import { Dictionary } from '../../../../common/types/common';
import { formatHumanReadableDateTimeSeconds } from '../../../util/date_utils';

import { isKibanaContext, KibanaContext, PivotQuery } from '../../common';

import {
  EsDoc,
  EsFieldName,
  getSourceIndexDevConsoleStatement,
  MAX_COLUMNS,
  toggleSelectedField,
} from './common';
import { ExpandedRow } from './expanded_row';
import { SOURCE_INDEX_STATUS, useSourceIndexData } from './use_source_index_data';

type ItemIdToExpandedRowMap = Dictionary<JSX.Element>;

const CELL_CLICK_ENABLED = false;

// Defining our own ENUM here.
// EUI's SortDirection wasn't usable as a union type
// required for the Sorting interface.
enum SORT_DIRECTON {
  ASC = 'asc',
  DESC = 'desc',
}

interface Sorting {
  sort: {
    field: string;
    direction: SORT_DIRECTON.ASC | SORT_DIRECTON.DESC;
  };
}

type TableSorting = Sorting | boolean;

interface SourceIndexPreviewTitle {
  indexPatternTitle: string;
}
const SourceIndexPreviewTitle: React.SFC<SourceIndexPreviewTitle> = ({ indexPatternTitle }) => (
  <EuiTitle size="xs">
    <span>
      {i18n.translate('xpack.ml.dataframe.sourceIndexPreview.sourceIndexPatternTitle', {
        defaultMessage: 'Source index {indexPatternTitle}',
        values: { indexPatternTitle },
      })}
    </span>
  </EuiTitle>
);

interface Props {
  query: PivotQuery;
  cellClick?(search: string): void;
}

export const SourceIndexPreview: React.SFC<Props> = React.memo(({ cellClick, query }) => {
  const [clearTable, setClearTable] = useState(false);

  const kibanaContext = useContext(KibanaContext);

  if (!isKibanaContext(kibanaContext)) {
    return null;
  }

  const indexPattern = kibanaContext.currentIndexPattern;

  const [selectedFields, setSelectedFields] = useState([] as EsFieldName[]);
  const [isColumnsPopoverVisible, setColumnsPopoverVisible] = useState(false);

  // EuiInMemoryTable has an issue with dynamic sortable columns
  // and will trigger a full page Kibana error in such a case.
  // The following is a workaround until this is solved upstream:
  // - If the sortable/columns config changes,
  //   the table will be unmounted/not rendered.
  //   This is what setClearTable(true) in toggleColumn() does.
  // - After that on next render it gets re-enabled. To make sure React
  //   doesn't consolidate the state updates, setTimeout is used.
  if (clearTable) {
    setTimeout(() => setClearTable(false), 0);
  }

  function toggleColumnsPopover() {
    setColumnsPopoverVisible(!isColumnsPopoverVisible);
  }

  function closeColumnsPopover() {
    setColumnsPopoverVisible(false);
  }

  function toggleColumn(column: EsFieldName) {
    // spread to a new array otherwise the component wouldn't re-render
    setClearTable(true);
    setSelectedFields([...toggleSelectedField(selectedFields, column)]);
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

  const { errorMessage, status, tableItems } = useSourceIndexData(
    indexPattern,
    query,
    selectedFields,
    setSelectedFields
  );

  if (status === SOURCE_INDEX_STATUS.ERROR) {
    return (
      <EuiPanel grow={false}>
        <SourceIndexPreviewTitle indexPatternTitle={indexPattern.title} />
        <EuiCallOut
          title={i18n.translate('xpack.ml.dataframe.sourceIndexPreview.sourceIndexPatternError', {
            defaultMessage: 'An error occurred loading the source index data.',
          })}
          color="danger"
          iconType="cross"
        >
          <p>{errorMessage}</p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  if (status === SOURCE_INDEX_STATUS.LOADED && tableItems.length === 0) {
    return (
      <EuiPanel grow={false}>
        <SourceIndexPreviewTitle indexPatternTitle={indexPattern.title} />
        <EuiCallOut
          title={i18n.translate(
            'xpack.ml.dataframe.sourceIndexPreview.dataFrameSourceIndexNoDataCalloutTitle',
            {
              defaultMessage: 'Empty source index query result.',
            }
          )}
          color="primary"
        >
          <p>
            {i18n.translate(
              'xpack.ml.dataframe.sourceIndexPreview.dataFrameSourceIndexNoDataCalloutBody',
              {
                defaultMessage:
                  'The query for the source index returned no results. Please make sure the index contains documents and your query is not too restrictive.',
              }
            )}
          </p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  let docFields: EsFieldName[] = [];
  let docFieldsCount = 0;
  if (tableItems.length > 0) {
    docFields = Object.keys(tableItems[0]._source);
    docFields.sort();
    docFieldsCount = docFields.length;
  }

  const columns = selectedFields.map(k => {
    const column = {
      field: `_source["${k}"]`,
      name: k,
      sortable: true,
      truncateText: true,
    } as Dictionary<any>;

    const field = indexPattern.fields.find(f => f.name === k);
    const render = (d: string) => {
      return field !== undefined && field.type === KBN_FIELD_TYPES.DATE
        ? formatHumanReadableDateTimeSeconds(moment(d).unix() * 1000)
        : d;
    };

    column.render = render;

    if (CELL_CLICK_ENABLED && cellClick) {
      column.render = (d: string) => (
        <EuiButtonEmpty size="xs" onClick={() => cellClick(`${k}:(${d})`)}>
          {render(d)}
        </EuiButtonEmpty>
      );
    }

    return column;
  });

  let sorting: TableSorting = false;

  if (columns.length > 0) {
    sorting = {
      sort: {
        field: columns[0].field,
        direction: SORT_DIRECTON.ASC,
      },
    };
  }

  columns.unshift({
    align: RIGHT_ALIGNMENT,
    width: '40px',
    isExpander: true,
    render: (item: EsDoc) => (
      <EuiButtonIcon
        onClick={() => toggleDetails(item)}
        aria-label={
          itemIdToExpandedRowMap[item._id]
            ? i18n.translate('xpack.ml.dataframe.sourceIndexPreview.rowCollapse', {
                defaultMessage: 'Collapse',
              })
            : i18n.translate('xpack.ml.dataframe.sourceIndexPreview.rowExpand', {
                defaultMessage: 'Expand',
              })
        }
        iconType={itemIdToExpandedRowMap[item._id] ? 'arrowUp' : 'arrowDown'}
      />
    ),
  });

  const euiCopyText = i18n.translate('xpack.ml.dataframe.sourceIndexPreview.copyClipboardTooltip', {
    defaultMessage: 'Copy Dev Console statement of the source index preview to the clipboard.',
  });

  return (
    <EuiPanel grow={false}>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <SourceIndexPreviewTitle indexPatternTitle={indexPattern.title} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem>
              {docFieldsCount > MAX_COLUMNS && (
                <EuiText size="s">
                  {i18n.translate('xpack.ml.dataframe.sourceIndexPreview.fieldSelection', {
                    defaultMessage:
                      'showing {selectedFieldsLength, number} of {docFieldsCount, number} {docFieldsCount, plural, one {field} other {fields}}',
                    values: { selectedFieldsLength: selectedFields.length, docFieldsCount },
                  })}
                </EuiText>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <EuiPopover
                  id="popover"
                  button={
                    <EuiButtonIcon
                      iconType="gear"
                      onClick={toggleColumnsPopover}
                      aria-label={i18n.translate(
                        'xpack.ml.dataframe.sourceIndexPreview.selectColumnsAriaLabel',
                        {
                          defaultMessage: 'Select columns',
                        }
                      )}
                    />
                  }
                  isOpen={isColumnsPopoverVisible}
                  closePopover={closeColumnsPopover}
                  ownFocus
                >
                  <EuiPopoverTitle>
                    {i18n.translate(
                      'xpack.ml.dataframe.sourceIndexPreview.selectFieldsPopoverTitle',
                      {
                        defaultMessage: 'Select fields',
                      }
                    )}
                  </EuiPopoverTitle>
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
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiCopy
                beforeMessage={euiCopyText}
                textToCopy={getSourceIndexDevConsoleStatement(query, indexPattern.title)}
              >
                {(copy: () => void) => (
                  <EuiButtonIcon onClick={copy} iconType="copyClipboard" aria-label={euiCopyText} />
                )}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {status === SOURCE_INDEX_STATUS.LOADING && <EuiProgress size="xs" color="accent" />}
      {status !== SOURCE_INDEX_STATUS.LOADING && (
        <EuiProgress size="xs" color="accent" max={1} value={0} />
      )}
      {clearTable === false && (
        <ExpandableTable
          compressed
          items={tableItems}
          columns={columns}
          pagination={{
            initialPageSize: 5,
            pageSizeOptions: [5, 10, 25],
          }}
          hasActions={false}
          isSelectable={false}
          itemId="_id"
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          isExpandable={true}
          sorting={sorting}
        />
      )}
    </EuiPanel>
  );
});
