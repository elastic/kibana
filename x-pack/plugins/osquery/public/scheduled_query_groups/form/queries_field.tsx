/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findIndex, forEach, pullAt, pullAllBy } from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer } from '@elastic/eui';
import { produce } from 'immer';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { satisfies } from 'semver';

import {
  OsqueryManagerPackagePolicyInputStream,
  OsqueryManagerPackagePolicyInput,
} from '../../../common/types';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { FieldHook } from '../../shared_imports';
import { ScheduledQueryGroupQueriesTable } from '../scheduled_query_group_queries_table';
import { QueryFlyout } from '../queries/query_flyout';
import { OsqueryPackUploader } from './pack_uploader';
import { getSupportedPlatforms } from '../queries/platforms/helpers';

interface QueriesFieldProps {
  handleNameChange: (name: string) => void;
  field: FieldHook<OsqueryManagerPackagePolicyInput[]>;
  integrationPackageVersion?: string | undefined;
  scheduledQueryGroupId: string;
}

interface GetNewStreamProps {
  id: string;
  interval: string;
  query: string;
  platform?: string | undefined;
  version?: string | undefined;
  scheduledQueryGroupId?: string;
  ecs_mapping?: Record<
    string,
    {
      field: string;
    }
  >;
}

interface GetNewStreamReturn extends Omit<OsqueryManagerPackagePolicyInputStream, 'id'> {
  id?: string | null;
}

const getNewStream = (payload: GetNewStreamProps) =>
  produce<GetNewStreamReturn>(
    {
      data_stream: { type: 'logs', dataset: `${OSQUERY_INTEGRATION_NAME}.result` },
      enabled: true,
      id: payload.scheduledQueryGroupId
        ? `osquery-${OSQUERY_INTEGRATION_NAME}.result-${payload.scheduledQueryGroupId}`
        : null,
      vars: {
        id: { type: 'text', value: payload.id },
        interval: {
          type: 'integer',
          value: payload.interval,
        },
        query: { type: 'text', value: payload.query },
      },
    },
    (draft) => {
      if (payload.platform && draft.vars) {
        draft.vars.platform = { type: 'text', value: payload.platform };
      }
      if (payload.version && draft.vars) {
        draft.vars.version = { type: 'text', value: payload.version };
      }
      if (payload.ecs_mapping && draft.vars) {
        draft.vars.ecs_mapping = {
          value: payload.ecs_mapping,
        };
      }
      return draft;
    }
  );

const QueriesFieldComponent: React.FC<QueriesFieldProps> = ({
  field,
  handleNameChange,
  integrationPackageVersion,
  scheduledQueryGroupId,
}) => {
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
    (stream: OsqueryManagerPackagePolicyInputStream) => {
      const streamIndex = findIndex(field.value[0].streams, [
        'vars.id.value',
        stream.vars?.id.value,
      ]);

      if (streamIndex > -1) {
        setValue(
          produce((draft) => {
            pullAt(draft[0].streams, [streamIndex]);

            return draft;
          })
        );
      }
    },
    [field.value, setValue]
  );

  const handleEditClick = useCallback(
    (stream: OsqueryManagerPackagePolicyInputStream) => {
      const streamIndex = findIndex(field.value[0].streams, [
        'vars.id.value',
        stream.vars?.id.value,
      ]);

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
              // @ts-expect-error update
              draft[0].streams[showEditQueryFlyout].vars.id.value = updatedQuery.id;
              // @ts-expect-error update
              draft[0].streams[showEditQueryFlyout].vars.interval.value = updatedQuery.interval;
              // @ts-expect-error update
              draft[0].streams[showEditQueryFlyout].vars.query.value = updatedQuery.query;

              if (updatedQuery.platform?.length) {
                // @ts-expect-error update
                draft[0].streams[showEditQueryFlyout].vars.platform = {
                  type: 'text',
                  value: updatedQuery.platform,
                };
              } else {
                // @ts-expect-error update
                delete draft[0].streams[showEditQueryFlyout].vars.platform;
              }

              if (updatedQuery.version?.length) {
                // @ts-expect-error update
                draft[0].streams[showEditQueryFlyout].vars.version = {
                  type: 'text',
                  value: updatedQuery.version,
                };
              } else {
                // @ts-expect-error update
                delete draft[0].streams[showEditQueryFlyout].vars.version;
              }

              if (updatedQuery.ecs_mapping) {
                // @ts-expect-error update
                draft[0].streams[showEditQueryFlyout].vars.ecs_mapping = {
                  value: updatedQuery.ecs_mapping,
                };
              } else {
                // @ts-expect-error update
                delete draft[0].streams[showEditQueryFlyout].vars.ecs_mapping;
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
            draft[0].streams.push(
              // @ts-expect-error update
              getNewStream({
                ...newQuery,
                scheduledQueryGroupId,
              })
            );
            return draft;
          })
        );
        handleHideAddFlyout();
        resolve();
      }),
    [handleHideAddFlyout, scheduledQueryGroupId, setValue]
  );

  const handleDeleteQueries = useCallback(() => {
    setValue(
      produce((draft) => {
        pullAllBy(draft[0].streams, tableSelectedItems, 'vars.id.value');

        return draft;
      })
    );
    setTableSelectedItems([]);
  }, [setValue, tableSelectedItems]);

  const handlePackUpload = useCallback(
    (parsedContent, packName) => {
      /* Osquery scheduled packs are supported since osquery_manager@0.5.0 */
      const isOsqueryPackSupported = integrationPackageVersion
        ? satisfies(integrationPackageVersion, '>=0.5.0')
        : false;

      setValue(
        produce((draft) => {
          forEach(parsedContent.queries, (newQuery, newQueryId) => {
            draft[0].streams.push(
              // @ts-expect-error update
              getNewStream({
                id: isOsqueryPackSupported ? newQueryId : `pack_${packName}_${newQueryId}`,
                interval: newQuery.interval ?? parsedContent.interval,
                query: newQuery.query,
                version: newQuery.version ?? parsedContent.version,
                platform: getSupportedPlatforms(newQuery.platform ?? parsedContent.platform),
                scheduledQueryGroupId,
              })
            );
          });

          return draft;
        })
      );

      if (isOsqueryPackSupported) {
        handleNameChange(packName);
      }
    },
    [handleNameChange, integrationPackageVersion, scheduledQueryGroupId, setValue]
  );

  const tableData = useMemo(
    () => (field.value.length ? field.value[0].streams : []),
    [field.value]
  );

  const uniqueQueryIds = useMemo<string[]>(
    () =>
      field.value && field.value[0].streams.length
        ? field.value[0].streams.reduce((acc, stream) => {
            if (stream.vars?.id.value) {
              acc.push(stream.vars?.id.value);
            }

            return acc;
          }, [] as string[])
        : [],
    [field.value]
  );

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          {!tableSelectedItems.length ? (
            <EuiButton fill onClick={handleShowAddFlyout} iconType="plusInCircle">
              <FormattedMessage
                id="xpack.osquery.scheduledQueryGroup.queriesForm.addQueryButtonLabel"
                defaultMessage="Add query"
              />
            </EuiButton>
          ) : (
            <EuiButton color="danger" onClick={handleDeleteQueries} iconType="trash">
              <FormattedMessage
                id="xpack.osquery.scheduledQueryGroup.table.deleteQueriesButtonLabel"
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
      {field.value && field.value[0].streams?.length ? (
        <ScheduledQueryGroupQueriesTable
          data={tableData}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
          selectedItems={tableSelectedItems}
          setSelectedItems={setTableSelectedItems}
        />
      ) : null}
      <EuiSpacer />
      {<OsqueryPackUploader onChange={handlePackUpload} />}
      {showAddQueryFlyout && (
        <QueryFlyout
          uniqueQueryIds={uniqueQueryIds}
          integrationPackageVersion={integrationPackageVersion}
          onSave={handleAddQuery}
          onClose={handleHideAddFlyout}
        />
      )}
      {showEditQueryFlyout != null && showEditQueryFlyout >= 0 && (
        <QueryFlyout
          uniqueQueryIds={uniqueQueryIds}
          defaultValue={field.value[0].streams[showEditQueryFlyout]?.vars}
          integrationPackageVersion={integrationPackageVersion}
          onSave={handleEditQuery}
          onClose={handleHideEditFlyout}
        />
      )}
    </>
  );
};

export const QueriesField = React.memo(QueriesFieldComponent);
