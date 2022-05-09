/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, findIndex, forEach, pullAt, pullAllBy, pickBy } from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer, EuiComboBoxProps } from '@elastic/eui';
import { produce } from 'immer';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { OsqueryManagerPackagePolicyInputStream } from '../../../common/types';
import { FieldHook } from '../../shared_imports';
import { PackQueriesTable } from '../pack_queries_table';
import { QueryFlyout } from '../queries/query_flyout';
import { OsqueryPackUploader } from './pack_uploader';
import { getSupportedPlatforms } from '../queries/platforms/helpers';

interface QueriesFieldProps {
  handleNameChange: (name: string) => void;
  field: FieldHook<Array<Record<string, unknown>>>;
  euiFieldProps: EuiComboBoxProps<{}>;
}

const QueriesFieldComponent: React.FC<QueriesFieldProps> = ({
  field,
  handleNameChange,
  euiFieldProps,
}) => {
  const isReadOnly = !!euiFieldProps?.isDisabled;
  const [showAddQueryFlyout, setShowAddQueryFlyout] = useState(false);
  const [showEditQueryFlyout, setShowEditQueryFlyout] = useState<number>(-1);
  const [tableSelectedItems, setTableSelectedItems] = useState<
    OsqueryManagerPackagePolicyInputStream[]
  >([]);

  const handleShowAddFlyout = useCallback(() => setShowAddQueryFlyout(true), []);
  const handleHideAddFlyout = useCallback(() => setShowAddQueryFlyout(false), []);
  const handleHideEditFlyout = useCallback(() => setShowEditQueryFlyout(-1), []);

  const { setValue } = field;

  const handleDeleteClick = useCallback(
    (query) => {
      const streamIndex = findIndex(field.value, ['id', query.id]);

      if (streamIndex > -1) {
        setValue(
          produce((draft) => {
            pullAt(draft, [streamIndex]);

            return draft;
          })
        );
      }
    },
    [field.value, setValue]
  );

  const handleEditClick = useCallback(
    (query) => {
      const streamIndex = findIndex(field.value, ['id', query.id]);

      setShowEditQueryFlyout(streamIndex);
    },
    [field.value]
  );

  const handleEditQuery = useCallback(
    (updatedQuery) =>
      new Promise<void>((resolve) => {
        if (showEditQueryFlyout >= 0) {
          setValue(
            produce((draft) => {
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
                delete draft[showEditQueryFlyout].ecs_mapping;
              }

              return draft;
            })
          );
        }

        handleHideEditFlyout();
        resolve();
      }),
    [handleHideEditFlyout, setValue, showEditQueryFlyout]
  );

  const handleAddQuery = useCallback(
    (newQuery) =>
      new Promise<void>((resolve) => {
        setValue(
          produce((draft) => {
            draft.push(newQuery);

            return draft;
          })
        );
        handleHideAddFlyout();
        resolve();
      }),
    [handleHideAddFlyout, setValue]
  );

  const handleDeleteQueries = useCallback(() => {
    setValue(
      produce((draft) => {
        pullAllBy(draft, tableSelectedItems, 'id');

        return draft;
      })
    );
    setTableSelectedItems([]);
  }, [setValue, tableSelectedItems]);

  const handlePackUpload = useCallback(
    (parsedContent, packName) => {
      setValue(
        produce((draft) => {
          forEach(parsedContent.queries, (newQuery, newQueryId) => {
            draft.push(
              pickBy(
                {
                  id: newQueryId,
                  interval: newQuery.interval ?? parsedContent.interval,
                  query: newQuery.query,
                  version: newQuery.version ?? parsedContent.version,
                  platform: getSupportedPlatforms(newQuery.platform ?? parsedContent.platform),
                },
                (value) => !isEmpty(value)
              )
            );
          });

          return draft;
        })
      );

      handleNameChange(packName);
    },
    [handleNameChange, setValue]
  );

  const tableData = useMemo(() => (field.value?.length ? field.value : []), [field.value]);

  const uniqueQueryIds = useMemo<string[]>(
    () =>
      field.value && field.value.length
        ? field.value.reduce((acc, query) => {
            if (query?.id) {
              // @ts-expect-error update types
              acc.push(query.id);
            }

            return acc;
          }, [] as string[])
        : [],
    [field.value]
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
      {field.value?.length ? (
        <PackQueriesTable
          // @ts-expect-error update types
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
          defaultValue={field.value[showEditQueryFlyout]}
          onSave={handleEditQuery}
          onClose={handleHideEditFlyout}
        />
      )}
    </>
  );
};

export const QueriesField = React.memo(QueriesFieldComponent);
