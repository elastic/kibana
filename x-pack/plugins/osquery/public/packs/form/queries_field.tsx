/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, findIndex, indexOf, pickBy, uniq, map } from 'lodash';
import type { EuiComboBoxProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer } from '@elastic/eui';
import { produce } from 'immer';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import deepEqual from 'fast-deep-equal';
import { useController, useFormContext, useWatch, useFieldArray } from 'react-hook-form';

import { PackQueriesTable } from '../pack_queries_table';
import { QueryFlyout } from '../queries/query_flyout';
import { OsqueryPackUploader } from './pack_uploader';
import { getSupportedPlatforms } from '../queries/platforms/helpers';
import type { PackQueryFormData } from '../queries/use_pack_query_form';

interface QueriesFieldProps {
  euiFieldProps: EuiComboBoxProps<{}>;
}

const QueriesFieldComponent: React.FC<QueriesFieldProps> = ({ euiFieldProps }) => {
  const {
    field: { value: fieldValue },
  } = useController<{ queries: PackQueryFormData[] }, 'queries'>({
    name: 'queries',
    defaultValue: [],
    rules: {},
  });

  const { append, remove, update, replace } = useFieldArray({
    name: 'queries',
  });

  const { setValue } = useFormContext();
  const { name: packName } = useWatch();

  const handleNameChange = useCallback(
    (newName: string) => isEmpty(packName) && setValue('name', newName),
    [packName, setValue]
  );

  const isReadOnly = !!euiFieldProps?.isDisabled;
  const [showAddQueryFlyout, setShowAddQueryFlyout] = useState(false);
  const [showEditQueryFlyout, setShowEditQueryFlyout] = useState<number>(-1);
  const [tableSelectedItems, setTableSelectedItems] = useState<PackQueryFormData[]>([]);

  const handleShowAddFlyout = useCallback(() => setShowAddQueryFlyout(true), []);
  const handleHideAddFlyout = useCallback(() => setShowAddQueryFlyout(false), []);
  const handleHideEditFlyout = useCallback(() => setShowEditQueryFlyout(-1), []);

  const handleDeleteClick = useCallback(
    (query) => {
      const streamIndex = findIndex(fieldValue, ['id', query.id]);

      if (streamIndex > -1) {
        remove(streamIndex);
      }
    },
    [fieldValue, remove]
  );

  const handleEditClick = useCallback(
    (query) => {
      const streamIndex = findIndex(fieldValue, ['id', query.id]);

      setShowEditQueryFlyout(streamIndex);
    },
    [fieldValue]
  );

  const handleEditQuery = useCallback(
    (updatedQuery) =>
      new Promise<void>((resolve) => {
        if (showEditQueryFlyout >= 0) {
          update(
            showEditQueryFlyout,
            produce({}, (draft: PackQueryFormData) => {
              draft.id = updatedQuery.id;
              draft.interval = updatedQuery.interval;
              draft.query = updatedQuery.query;

              if (updatedQuery.platform?.length) {
                draft.platform = updatedQuery.platform;
              }

              if (updatedQuery.version?.length) {
                draft.version = updatedQuery.version;
              }

              if (updatedQuery.ecs_mapping) {
                draft.ecs_mapping = updatedQuery.ecs_mapping;
              }

              draft.snapshot = updatedQuery.snapshot;
              draft.removed = updatedQuery.removed;

              return draft;
            })
          );
        }

        handleHideEditFlyout();
        resolve();
      }),
    [handleHideEditFlyout, update, showEditQueryFlyout]
  );

  const handleAddQuery = useCallback(
    (newQuery) =>
      new Promise<void>((resolve) => {
        append(newQuery);
        handleHideAddFlyout();
        resolve();
      }),
    [handleHideAddFlyout, append]
  );

  const handleDeleteQueries = useCallback(() => {
    const idsToRemove = map(tableSelectedItems, (selectedItem) =>
      indexOf(fieldValue, selectedItem)
    );
    remove(idsToRemove);
    setTableSelectedItems([]);
  }, [fieldValue, remove, tableSelectedItems]);

  const handlePackUpload = useCallback(
    (parsedContent, uploadedPackName) => {
      replace(
        map(parsedContent.queries, (newQuery, newQueryId) =>
          pickBy(
            {
              id: newQueryId,
              interval: newQuery.interval ?? parsedContent.interval ?? '3600',
              query: newQuery.query,
              version: newQuery.version ?? parsedContent.version,
              snapshot: newQuery.snapshot ?? parsedContent.snapshot,
              removed: newQuery.removed ?? parsedContent.removed,
              platform: getSupportedPlatforms(newQuery.platform ?? parsedContent.platform),
            },
            (value) => !isEmpty(value) || value === false
          )
        )
      );

      handleNameChange(uploadedPackName);
    },
    [handleNameChange, replace]
  );

  const tableData = useMemo(() => (fieldValue?.length ? fieldValue : []), [fieldValue]);
  const uniqueQueryIds = useMemo<string[]>(() => uniq(map(fieldValue, 'id')), [fieldValue]);

  return (
    <>
      {!isReadOnly && (
        <>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              {!tableSelectedItems.length ? (
                <EuiButton fill onClick={handleShowAddFlyout} iconType="plusInCircle">
                  <FormattedMessage
                    id="xpack.osquery.pack.queriesForm.addQueryButtonLabel"
                    defaultMessage="Add query"
                  />
                </EuiButton>
              ) : (
                <EuiButton color="danger" onClick={handleDeleteQueries} iconType="trash">
                  <FormattedMessage
                    id="xpack.osquery.pack.table.deleteQueriesButtonLabel"
                    defaultMessage="Delete {queriesCount, plural, one {# query} other {# queries}}"
                    // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                    values={{
                      queriesCount: tableSelectedItems.length,
                    }}
                  />
                </EuiButton>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
        </>
      )}
      {fieldValue?.length ? (
        <PackQueriesTable
          data={tableData}
          isReadOnly={isReadOnly}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
          selectedItems={tableSelectedItems}
          setSelectedItems={setTableSelectedItems}
        />
      ) : null}
      <EuiSpacer />
      {!isReadOnly && <OsqueryPackUploader onChange={handlePackUpload} />}
      {showAddQueryFlyout && (
        <QueryFlyout
          uniqueQueryIds={uniqueQueryIds}
          onSave={handleAddQuery}
          onClose={handleHideAddFlyout}
        />
      )}
      {showEditQueryFlyout != null && showEditQueryFlyout >= 0 && (
        <QueryFlyout
          uniqueQueryIds={uniqueQueryIds}
          // @ts-expect-error update types
          defaultValue={fieldValue[showEditQueryFlyout]}
          onSave={handleEditQuery}
          onClose={handleHideEditFlyout}
        />
      )}
    </>
  );
};

export const QueriesField = React.memo(QueriesFieldComponent, deepEqual);
