/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect, useCallback } from 'react';
import { EuiFlyoutFooter, EuiFlyoutHeader, EuiTitle, EuiFlexItem, Query } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { AssignableObject } from '../../../common/types';
import { ITagInternalClient } from '../../services';
import { parseQuery, computeRequiredChanges } from './lib';
import { AssignmentOverrideMap, AssignmentStatus, AssignmentStatusMap } from './types';
import {
  AssignFlyoutSearchBar,
  AssignFlyoutResultList,
  AssignFlyoutFooter,
  AssignFlyoutActionBar,
} from './components';
import { getKey } from './utils';

import './assign_flyout.scss';

interface AssignFlyoutProps {
  tagIds: string[];
  allowedTypes: string[];
  tagClient: ITagInternalClient;
  onClose: () => Promise<void>;
}

const getObjectStatus = (object: AssignableObject, assignedTags: string[]): AssignmentStatus => {
  const assignedCount = assignedTags.reduce((count, tagId) => {
    return count + (object.tags.includes(tagId) ? 1 : 0);
  }, 0);
  return assignedCount === 0 ? 'none' : assignedCount === assignedTags.length ? 'full' : 'partial';
};

export const AssignFlyout: FC<AssignFlyoutProps> = ({
  tagIds,
  allowedTypes,
  tagClient,
  onClose,
}) => {
  const [results, setResults] = useState<AssignableObject[]>([]);
  const [query, setQuery] = useState<Query>(Query.parse(''));
  const [initialStatus, setInitialStatus] = useState<AssignmentStatusMap>({});
  const [overrides, setOverrides] = useState<AssignmentOverrideMap>({});
  const [isLoading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const refreshResults = async () => {
      setLoading(true);
      const { queryText, selectedTypes } = parseQuery(query);

      const fetched = await tagClient.findAssignableObject({
        search: queryText ? `${queryText}*` : undefined,
        types: selectedTypes,
        maxResults: 1000,
      });

      setResults(fetched);
      setOverrides({});
      setInitialStatus(
        fetched.reduce((status, result) => {
          return {
            ...status,
            [getKey(result)]: getObjectStatus(result, tagIds),
          };
        }, {} as AssignmentStatusMap)
      );
      setLoading(false);
    };

    refreshResults();
  }, [query, tagClient, tagIds]);

  const onSave = useCallback(() => {
    const changes = computeRequiredChanges({ objects: results, initialStatus, overrides });
    // console.log('changes =', changes);
    // TODO: implement.
  }, [results, initialStatus, overrides]);

  const selectAll = useCallback(() => {
    setOverrides(
      results.reduce((status, result) => {
        return {
          ...status,
          [getKey(result)]: 'selected',
        };
      }, {} as AssignmentOverrideMap)
    );
  }, [results]);

  const deselectAll = useCallback(() => {
    setOverrides(
      results.reduce((status, result) => {
        return {
          ...status,
          [getKey(result)]: 'deselected',
        };
      }, {} as AssignmentOverrideMap)
    );
  }, [results]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.savedObjectsTagging.assignFlyout.title"
              defaultMessage="Manage tag assignments to saved objects"
            />
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutHeader hasBorder>
        <AssignFlyoutSearchBar
          onChange={({ query: newQuery }) => {
            setQuery(newQuery);
          }}
          isLoading={isLoading}
          types={allowedTypes}
        />
        <AssignFlyoutActionBar
          resultCount={results.length}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
        />
      </EuiFlyoutHeader>
      <EuiFlexItem grow={1}>
        <AssignFlyoutResultList
          results={results}
          isLoading={isLoading}
          initialStatus={initialStatus}
          overrides={overrides}
          onChange={(newOverrides) => {
            setOverrides((oldOverrides) => ({
              ...oldOverrides,
              ...newOverrides,
            }));
          }}
        />
      </EuiFlexItem>
      <EuiFlyoutFooter>
        <AssignFlyoutFooter onSave={onSave} onCancel={onClose} />
      </EuiFlyoutFooter>
    </>
  );
};
