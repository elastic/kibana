/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, findIndex, forEach, pullAt, pullAllBy, pickBy } from 'lodash';
import type { EuiComboBoxProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer } from '@elastic/eui';
import { produce } from 'immer';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import deepEqual from 'fast-deep-equal';
import { useController, useFormContext, useWatch } from 'react-hook-form';

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
    field: { onChange, value: fieldValue },
  } = useController<{ queries: PackQueryFormData[] }, 'queries'>({
    name: 'queries',
    defaultValue: [],
    rules: {},
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
        onChange(
          produce((draft: PackQueryFormData[]) => {
            pullAt(draft, [streamIndex]);

            return draft;
          })
        );
      }
    },
    [fieldValue, onChange]
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
          onChange(
            produce((draft: PackQueryFormData[]) => {
              draft[showEditQueryFlyout].id = updatedQuery.id;
              draft[showEditQueryFlyout].interval = updatedQuery.interval;
              draft[showEditQueryFlyout].query = updatedQuery.query;

              if (updatedQuery.platform?.length) {
                draft[showEditQueryFlyout].platform = updatedQuery.platform;
              } else {
                delete draft[showEditQueryFlyout].platform;
              }

              if (updatedQuery.version?.length) {
                draft[showEditQueryFlyout].version = updatedQuery.version;
              } else {
                delete draft[showEditQueryFlyout].version;
              }

              if (updatedQuery.ecs_mapping) {
                draft[showEditQueryFlyout].ecs_mapping = updatedQuery.ecs_mapping;
              } else {
                // @ts-expect-error update types
                delete draft[showEditQueryFlyout].ecs_mapping;
              }

              if (updatedQuery.snapshot) {
                delete draft[showEditQueryFlyout].snapshot;
                delete draft[showEditQueryFlyout].removed;
              } else {
                if (updatedQuery.snapshot === false) {
                  draft[showEditQueryFlyout].snapshot = updatedQuery.snapshot;
                  if (updatedQuery.removed !== undefined) {
                    draft[showEditQueryFlyout].removed = updatedQuery.removed;
                  }
                }
              }

              return draft;
            })
          );
        }

        handleHideEditFlyout();
        resolve();
      }),
    [handleHideEditFlyout, onChange, showEditQueryFlyout]
  );

  const handleAddQuery = useCallback(
    (newQuery) =>
      new Promise<void>((resolve) => {
        onChange(
          produce((draft: PackQueryFormData[]) => {
            draft.push(newQuery);

            return draft;
          })
        );
        handleHideAddFlyout();
        resolve();
      }),
    [handleHideAddFlyout, onChange]
  );

  const handleDeleteQueries = useCallback(() => {
    onChange(
      produce((draft: PackQueryFormData[]) => {
        pullAllBy(draft, tableSelectedItems, 'id');

        return draft;
      })
    );
    setTableSelectedItems([]);
  }, [onChange, tableSelectedItems]);

  const handlePackUpload = useCallback(
    (parsedContent, uploadedPackName) => {
      onChange(
        produce((draft: PackQueryFormData[]) => {
          forEach(parsedContent.queries, (newQuery, newQueryId) => {
            draft.push(
              // @ts-expect-error update types
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
            );
          });

          return draft;
        })
      );

      handleNameChange(uploadedPackName);
    },
    [handleNameChange, onChange]
  );

  const tableData = useMemo(() => (fieldValue?.length ? fieldValue : []), [fieldValue]);

  const uniqueQueryIds = useMemo<string[]>(
    () =>
      fieldValue && fieldValue.length
        ? fieldValue.reduce((acc, query) => {
            if (query?.id) {
              acc.push(query.id);
            }

            return acc;
          }, [] as string[])
        : [],
    [fieldValue]
  );

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
          defaultValue={value[showEditQueryFlyout]}
          onSave={handleEditQuery}
          onClose={handleHideEditFlyout}
        />
      )}
    </>
  );
};

export const QueriesField = React.memo(QueriesFieldComponent, deepEqual);
