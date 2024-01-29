/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButtonIcon, EuiText } from '@elastic/eui';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { getShouldShowFieldHandler } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils/src/types';
import { dynamic } from '@kbn/shared-ux-utility';
import { useDocDetail, getMessageWithFallbacks } from '../../hooks/use_doc_detail';
import { LogDocument } from '../../../common/document';
import { LogLevel } from '../common/log_level';
import * as constants from '../../../common/constants';
import './virtual_column.scss';

const SourceDocument = dynamic(
  () => import('@kbn/unified-data-table/src/components/source_document')
);

const DiscoverSourcePopoverContent = dynamic(
  () => import('@kbn/unified-data-table/src/components/source_popover_content')
);

const LogMessage = ({ field, value }: { field?: string; value: string }) => {
  const renderFieldPrefix = field && field !== constants.MESSAGE_FIELD;
  return (
    <EuiText size="xs" style={{ display: 'inline', marginLeft: '5px' }}>
      {renderFieldPrefix && (
        <strong data-test-subj="logExplorerDataTableMessageKey">{field}</strong>
      )}
      <span data-test-subj="logExplorerDataTableMessageValue" style={{ marginLeft: '5px' }}>
        {value}
      </span>
    </EuiText>
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
      aria-label={i18n.translate('xpack.logsExplorer.grid.closePopover', {
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

export const Content = ({
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
    <span>
      {parsedDoc[constants.LOG_LEVEL_FIELD] && (
        <LogLevel level={parsedDoc[constants.LOG_LEVEL_FIELD]} />
      )}
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
          className="logsExplorerVirtualColumn__sourceDocument"
        />
      )}
    </span>
  );
};
