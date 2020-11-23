/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo, useState, useEffect, useCallback } from 'react';
import {
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSearchBar,
  SearchFilterConfig,
  Query,
  EuiSelectable,
  EuiSelectableOption,
  EuiIcon,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AssignableObject } from '../../../common/types';
import { ITagInternalClient } from '../../tags';
import { parseQuery } from './lib';

import './assign_flyout.scss';

interface AssignFlyoutProps {
  tagIds: string[];
  allowedTypes: string[];
  tagClient: ITagInternalClient;
  onClose: () => Promise<void>;
}

type AssignmentStatus = 'full' | 'none' | 'partial';
type AssignmentOverride = 'selected' | 'deselected';

type AssignmentStatusMap = Record<string, AssignmentStatus>;
type AssignmentOverrideMap = Record<string, AssignmentOverride>;

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
        <AssignFlyoutFooter onSave={() => undefined} onCancel={onClose} />
      </EuiFlyoutFooter>
    </>
  );
};

//////////

interface AssignFlyoutFooterProps {
  onCancel: () => void;
  onSave: () => void;
}

const AssignFlyoutFooter: FC<AssignFlyoutFooterProps> = ({ onCancel, onSave }) => {
  return (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="assignFlyoutCancelButton">
          <FormattedMessage
            id="xpack.savedObjectsTagging.assignFlyout.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton onClick={onSave} fill iconType="save" data-test-subj="assignFlyoutConfirmButton">
          <FormattedMessage
            id="xpack.savedObjectsTagging.assignFlyout.confirmButtonLabel"
            defaultMessage="Save tag assignments"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

//////////

interface AssignFlyoutSearchBarProps {
  onChange: (args: any) => void | boolean;
  isLoading: boolean;
  types: string[];
}

const AssignFlyoutSearchBar: FC<AssignFlyoutSearchBarProps> = ({ onChange, types, isLoading }) => {
  const filters = useMemo(() => {
    return [
      {
        type: 'field_value_selection',
        field: 'type',
        name: i18n.translate('xpack.savedObjectsTagging.assignFlyout.typeFilterName', {
          defaultMessage: 'Type',
        }),
        multiSelect: 'or',
        options: types.map((type) => ({
          value: type,
          name: type,
        })),
      } as SearchFilterConfig,
    ];
  }, [types]);

  return (
    <EuiSearchBar
      box={{
        'data-test-subj': 'assignFlyoutSearchBar',
        placeholder: i18n.translate('xpack.savedObjectsTagging.assignFlyout.searchPlaceholder', {
          defaultMessage: 'Search by saved object name',
        }),
        isLoading,
      }}
      onChange={onChange}
      filters={filters}
    />
  );
};

///////////

interface AssignFlyoutActionBarProps {
  resultCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const AssignFlyoutActionBar: FC<AssignFlyoutActionBarProps> = ({
  resultCount,
  onSelectAll,
  onDeselectAll,
}) => {
  return (
    <div className="tagAssignFlyout__actionBar">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.savedObjectsTagging.assignFlyout.actionBar.totalResultsLabel"
              defaultMessage="{count, plural, one {1 saved object} other {# saved objects}}"
              values={{
                count: resultCount,
              }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={true}> </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <EuiLink onClick={onSelectAll} data-test-subj="assignFlyout-contextMenuButton">
              <FormattedMessage
                id="xpack.savedObjectsTagging.assignFlyout.actionBar.selectedAllLabel"
                defaultMessage="Select all"
              />
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <EuiLink onClick={onDeselectAll} data-test-subj="assignFlyout-contextMenuButton">
              <FormattedMessage
                id="xpack.savedObjectsTagging.assignFlyout.actionBar.deselectedAllLabel"
                defaultMessage="Deselect all"
              />
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

//////////

interface AssignFlyoutResultListProps {
  isLoading: boolean;
  results: AssignableObject[];
  initialStatus: AssignmentStatusMap;
  overrides: AssignmentOverrideMap;
  onChange: (newOverrides: AssignmentOverrideMap) => void;
}

const getOverriddenStatus = (
  initialStatus: AssignmentStatus,
  override: AssignmentOverride | undefined
): AssignmentStatus => {
  if (override) {
    return override === 'selected' ? 'full' : 'none';
  }
  return initialStatus;
};

const AssignFlyoutResultList: FC<AssignFlyoutResultListProps> = ({
  results,
  isLoading,
  initialStatus,
  overrides,
  onChange,
}) => {
  const options = results.map((result) => {
    const key = getKey(result);
    const overriddenStatus = getOverriddenStatus(initialStatus[key], overrides[key]);
    const checkedStatus = overriddenStatus === 'full' ? 'on' : undefined;
    const statusIcon =
      overriddenStatus === 'full' ? 'check' : overriddenStatus === 'none' ? 'empty' : 'partial';

    return {
      label: result.title,
      key,
      checked: checkedStatus,
      previousState: checkedStatus,
      showIcons: false,
      prepend: (
        <>
          <EuiIcon className="tagAssignFlyout__selectionIcon" type={statusIcon} />
          <EuiIcon type={result.icon ?? 'empty'} title={result.type} />
        </>
      ),
    } as EuiSelectableOption<{ previousState: 'on' | undefined }>;
  });

  return (
    <EuiSelectable<{ previousState: 'on' | undefined }>
      height="full"
      options={options}
      allowExclusions={false}
      isLoading={isLoading}
      onChange={(newOptions) => {
        const newOverrides = newOptions.reduce<AssignmentOverrideMap>((memo, option) => {
          if (option.checked === option.previousState) {
            return memo;
          }
          return {
            ...memo,
            [option.key!]: option.checked === 'on' ? 'selected' : 'deselected',
          };
        }, {});

        onChange(newOverrides);
      }}
    >
      {(list) => list}
    </EuiSelectable>
  );
};

const getKey = ({ id, type }: AssignableObject) => `${type}|${id}`;
const parseKey = (key: string): { type: string; id: string } => {
  const parts = key.split('|');
  return {
    type: parts[0],
    id: parts[1],
  };
};
