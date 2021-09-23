/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash/fp';
import { useCallback } from 'react';
import { observabilityAppId } from '../../../common';
import { useKibana } from '../../utils/kibana_react';

export const casesBreadcrumbs = {
  cases: {
    text: i18n.translate('xpack.observability.breadcrumbs.casesLinkText', {
      defaultMessage: 'Cases',
    }),
  },
  create: {
    text: i18n.translate('xpack.observability.breadcrumbs.casesCreateLinkText', {
      defaultMessage: 'Create',
    }),
  },
  configure: {
    text: i18n.translate('xpack.observability.breadcrumbs.casesConfigureLinkText', {
      defaultMessage: 'Configure',
    }),
  },
};

export const getCaseDetailsUrl = ({ id, subCaseId }: { id: string; subCaseId?: string }) => {
  if (subCaseId) {
    return `/${encodeURIComponent(id)}/sub-cases/${encodeURIComponent(subCaseId)}`;
  }
  return `/${encodeURIComponent(id)}`;
};
interface FormatUrlOptions {
  absolute: boolean;
}

export type FormatUrl = (path: string, options?: Partial<FormatUrlOptions>) => string;
export const useFormatUrl = () => {
  const { getUrlForApp } = useKibana().services.application;
  const formatUrl = useCallback<FormatUrl>(
    (path: string, { absolute = false } = {}) => {
      const pathArr = path.split('?');
      const formattedPath = `/cases/${pathArr[0]}${isEmpty(pathArr[1]) ? '' : `?${pathArr[1]}`}`;
      return getUrlForApp(observabilityAppId, {
        path: formattedPath,
        absolute,
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
export const getCaseUrl = () => `/`;
