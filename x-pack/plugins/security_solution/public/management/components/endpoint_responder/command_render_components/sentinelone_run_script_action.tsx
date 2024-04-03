/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiLoadingSpinner,
  EuiSelectable,
} from '@elastic/eui';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { SentinelOneGetRemoteScriptsResponse } from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import { useHttp } from '../../../../common/lib/kibana';
import { BASE_ENDPOINT_ACTION_ROUTE } from '../../../../../common/endpoint/constants';
import type { CommandArgumentValueSelectorProps } from '../../console/types';

export const SentineloneRunScriptAction = memo((props) => {
  return <div>{'SentineloneRunScriptAction placeholder'}</div>;
});
SentineloneRunScriptAction.displayName = 'SentineloneRunScriptAction';

export const SentineloneScriptSelector = memo<
  CommandArgumentValueSelectorProps<{}, { isPopoverOpen: boolean }>
>(({ value, valueText, onChange, store: _store }) => {
  const state = useMemo<{ isPopoverOpen: boolean }>(() => {
    return _store ?? { isPopoverOpen: true };
  }, [_store]);

  const { data } = useFetchSentinelOneScripts();

  const selectableScriptList: EuiSelectableOption[] = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.data.map((script) => {
      return {
        label: script.scriptName,
        data: script,
      };
    });
  }, [data]);

  const setIsPopoverOpen = useCallback(
    (newValue: boolean) => {
      onChange({
        value,
        valueText,
        store: {
          ...state,
          isPopoverOpen: newValue,
        },
      });
    },
    [onChange, state, value, valueText]
  );

  const handleOpenPopover = useCallback(() => {
    setIsPopoverOpen(true);
  }, [setIsPopoverOpen]);

  const handleClosePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, [setIsPopoverOpen]);

  const handleScriptSelection = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const selectedScript = newOptions.find((opt) => opt.checked === 'on');

      if (selectedScript) {
        onChange({
          value: selectedScript.data,
          valueText: selectedScript.data.scriptName,
          store: {
            ...state,
            isPopoverOpen: false,
          },
        });
      }
    },
    [onChange, state]
  );

  return (
    <div>
      <EuiPopover
        isOpen={state.isPopoverOpen}
        closePopover={handleClosePopover}
        anchorPosition="upRight"
        ownFocus={true}
        button={
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false} className="eui-textTruncate" onClick={handleOpenPopover}>
              <div className="eui-textTruncate" title="select script">
                {valueText || 'select script'}
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="indexRuntime"
                size="xs"
                onClick={handleOpenPopover}
                aria-label="Select script"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        {state.isPopoverOpen && (
          <div style={{ minWidth: '50ch' }}>
            {!data ? (
              <EuiLoadingSpinner size="s" />
            ) : (
              <EuiSelectable
                searchable
                options={selectableScriptList}
                onChange={handleScriptSelection}
                singleSelection={true}
              >
                {(list, search) => (
                  <>
                    {search}
                    {list}
                  </>
                )}
              </EuiSelectable>
            )}
          </div>
        )}
      </EuiPopover>
    </div>
  );
});
SentineloneScriptSelector.displayName = 'SentineloneScriptSelector';

const useFetchSentinelOneScripts = (): UseQueryResult<
  SentinelOneGetRemoteScriptsResponse,
  IHttpFetchError
> => {
  const http = useHttp();

  return useQuery<SentinelOneGetRemoteScriptsResponse, IHttpFetchError>({
    queryKey: ['get-sentinelone-script-list'],
    keepPreviousData: true,
    queryFn: async () => {
      return http.get<SentinelOneGetRemoteScriptsResponse>(
        `/internal${BASE_ENDPOINT_ACTION_ROUTE}/sentinel_one/scripts`,
        {
          version: '1',
        }
      );
    },
  });
};
