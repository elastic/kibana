/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { isEmpty } from 'lodash/fp';
import { useKibana } from '../../utils/kibana_react';
import { CASES_APP_ID } from '../../components/app/cases/constants';

export const getCaseDetailsUrl = ({ id, subCaseId }: { id: string; subCaseId?: string }) => {
  if (subCaseId) {
    return `/${encodeURIComponent(id)}/sub-cases/${encodeURIComponent(subCaseId)}`;
  }
  return `/${encodeURIComponent(id)}`;
};

export type FormatUrl = (path: string) => string;
export const useFormatUrl = () => {
  const { getUrlForApp } = useKibana().services.application;
  const formatUrl = useCallback<FormatUrl>(
    (path: string) => {
      const pathArr = path.split('?');
      const formattedPath = `${pathArr[0]}${isEmpty(pathArr[1]) ? '' : `?${pathArr[1]}`}`;
      return getUrlForApp(`${CASES_APP_ID}`, {
        path: formattedPath,
        absolute: false,
      });
    },
    [getUrlForApp]
  );
  return { formatUrl };
};

export const getCaseDetailsUrlWithCommentId = ({
  id,
  commentId,
  subCaseId,
}: {
  id: string;
  commentId: string;
  subCaseId?: string;
}) => {
  if (subCaseId) {
    return `/${encodeURIComponent(id)}/sub-cases/${encodeURIComponent(
      subCaseId
    )}/${encodeURIComponent(commentId)}`;
  }
  return `/${encodeURIComponent(id)}/${encodeURIComponent(commentId)}`;
};

export const getCreateCaseUrl = () => `/create`;

export const getConfigureCasesUrl = () => `/configure`;
