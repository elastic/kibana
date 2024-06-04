/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { IFieldSubTypeNested } from '@kbn/es-query';

import type { BrowserField } from '@kbn/timelines-plugin/common';
import { i18n } from '@kbn/i18n';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { GlobalTimeArgs } from '../../../../common/containers/use_global_time';
import { getScopeFromPath, useSourcererDataView } from '../../../../sourcerer/containers';
import { getAllFieldsByName } from '../../../../common/containers/source';
import { isLensSupportedType } from '../../../../common/utils/lens';

export interface UseInspectButtonParams extends Pick<GlobalTimeArgs, 'setQuery' | 'deleteQuery'> {
  response: string;
  request: string;
  refetch: (() => void) | null;
  uniqueQueryId: string;
  loading: boolean;
  searchSessionId?: string;
}

/**
 * * Add query to inspect button utility.
 * * Delete query from inspect button utility when component unmounts
 */
export const useInspectButton = ({
  setQuery,
  response,
  request,
  refetch,
  uniqueQueryId,
  deleteQuery,
  loading,
  searchSessionId,
}: UseInspectButtonParams) => {
  useEffect(() => {
    if (refetch != null && setQuery != null) {
      setQuery({
        id: uniqueQueryId,
        inspect: {
          dsl: [request],
          response: [response],
        },
        loading,
        refetch,
        searchSessionId,
      });
    }

    return () => {
      if (deleteQuery) {
        deleteQuery({ id: uniqueQueryId });
      }
    };
  }, [setQuery, loading, response, request, refetch, uniqueQueryId, deleteQuery, searchSessionId]);
};

export function isDataViewFieldSubtypeNested(field: Partial<BrowserField>) {
  const subTypeNested = field?.subType as IFieldSubTypeNested;
  return !!subTypeNested?.nested?.path;
}

export interface GetAggregatableFields {
  [fieldName: string]: Partial<BrowserField>;
}

export function getAggregatableFields(
  fields: GetAggregatableFields,
  useLensCompatibleFields?: boolean
): EuiComboBoxOptionOption[] {
  const result = [];
  for (const [key, field] of Object.entries(fields)) {
    if (useLensCompatibleFields) {
      if (
        !!field.aggregatable &&
        isLensSupportedType(field.type) &&
        !isDataViewFieldSubtypeNested(field)
      ) {
        result.push({ label: key, value: key });
      }
    } else {
      if (field.aggregatable === true) {
        result.push({ label: key, value: key });
      }
    }
  }
  return result;
}

export const useStackByFields = (useLensCompatibleFields?: boolean) => {
  const { pathname } = useLocation();
  const { addError } = useAppToasts();
  const { browserFields } = useSourcererDataView(getScopeFromPath(pathname));

  return useCallback(() => {
    try {
      return getAggregatableFields(getAllFieldsByName(browserFields), useLensCompatibleFields);
    } catch (err) {
      addError(err, {
        title: i18n.translate('xpack.securitySolution.useStackByFields.error.title', {
          defaultMessage: 'Error fetching fields',
        }),
        toastMessage: i18n.translate('xpack.securitySolution.useStackByFields.error.toastMessage', {
          defaultMessage: 'This error indicates an exceedingly large number of fields in an index',
        }),
      });
      return [];
    }
  }, [addError, browserFields, useLensCompatibleFields]);
};
