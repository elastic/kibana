/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { getShouldShowFieldHandler } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils/src/types';
import { useDocDetail, getMessageWithFallbacks } from '../../hooks/use_doc_detail';
import { LogDocument, LogExplorerDiscoverServices } from '../../controller';
import { LogLevel } from '../common/log_level';
import * as constants from '../../../common/constants';
import { dynamic } from '../../utils/dynamic';
import { VirtualColumnServiceProvider } from '../../hooks/use_virtual_column_services';

const SourceDocument = dynamic(
  () => import('@kbn/unified-data-table/src/components/source_document')
);

const DiscoverSourcePopoverContent = dynamic(
  () => import('@kbn/unified-data-table/src/components/source_popover_content')
);

const LogMessage = ({ field, value }: { field?: string; value: string }) => {
  const renderFieldPrefix = field && field !== constants.MESSAGE_FIELD;
  return (
    <EuiFlexGroup gutterSize="xs">
      {renderFieldPrefix && (
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            css={{ fontWeight: 700 }}
            data-test-subj="logExplorerDataTableMessageKey"
          >
            {field}
          </EuiText>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiText size="xs" data-test-subj="logExplorerDataTableMessageValue">
          {value}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const SourcePopoverContent = ({
  row,
  columnId,
  closePopover,
}: {
  row: DataTableRecord;
  columnId: string;
  closePopover: () => void;
}) => {
  const closeButton = (
    <EuiButtonIcon
      aria-label={i18n.translate('xpack.logExplorer.grid.closePopover', {
        defaultMessage: `Close popover`,
      })}
      data-test-subj="docTableClosePopover"
      iconSize="s"
      iconType="cross"
      size="xs"
      onClick={closePopover}
    />
  );
  return (
    <DiscoverSourcePopoverContent
      row={row}
      columnId={columnId}
      closeButton={closeButton}
      useTopLevelObjectColumns={false}
    />
  );
};

const Content = ({
  row,
  dataView,
  fieldFormats,
  isDetails,
  columnId,
  closePopover,
}: DataGridCellValueElementProps) => {
  const parsedDoc = useDocDetail(row as LogDocument, { dataView });
  const { field, value } = getMessageWithFallbacks(parsedDoc);
  const renderLogMessage = field && value;

  const shouldShowFieldHandler = useMemo(() => {
    const dataViewFields = dataView.fields.getAll().map((fld) => fld.name);
    return getShouldShowFieldHandler(dataViewFields, dataView, true);
  }, [dataView]);

  if (isDetails && !renderLogMessage) {
    return <SourcePopoverContent row={row} columnId={columnId} closePopover={closePopover} />;
  }

  return (
    <EuiFlexGroup gutterSize="xs">
      {parsedDoc[constants.LOG_LEVEL_FIELD] && (
        <EuiFlexItem grow={false} css={{ minWidth: '80px' }}>
          <LogLevel level={parsedDoc[constants.LOG_LEVEL_FIELD]} />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        {renderLogMessage ? (
          <LogMessage field={field} value={value} />
        ) : (
          <SourceDocument
            useTopLevelObjectColumns={false}
            row={row}
            dataView={dataView}
            columnId={columnId}
            fieldFormats={fieldFormats}
            shouldShowFieldHandler={shouldShowFieldHandler}
            maxEntries={50}
            dataTestSubj="logExplorerCellDescriptionList"
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const renderContent =
  ({ data }: { data: LogExplorerDiscoverServices['data'] }) =>
  (props: DataGridCellValueElementProps) => {
    const { dataView } = props;
    const virtualColumnServices = {
      data,
      dataView,
    };
    return (
      <VirtualColumnServiceProvider services={virtualColumnServices}>
        <Content {...props} />
      </VirtualColumnServiceProvider>
    );
  };
