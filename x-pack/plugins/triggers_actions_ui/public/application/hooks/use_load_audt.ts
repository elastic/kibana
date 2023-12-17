/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { KueryNode } from '@kbn/es-query';
import { loadAuditByRuleId, LoadAuditProps, Pagination } from '../lib/audit_api/find_audit';
import { useKibana } from '../../common/lib/kibana';

type UseLoadAlertingAuditProps = Omit<LoadAuditProps, 'http'> & {
  onPage: (pagination: Pagination) => void;
  page: LoadAuditProps['page'];
  sort: LoadAuditProps['sort'];
  search?: string;
  filter?: string | KueryNode;
};

export const useLoadAlertingAudit = (props: UseLoadAlertingAuditProps) => {
  const { page, sort, onPage, search, filter } = props;
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const { refetch, isLoading, data, isFetching } = useQuery({
    queryKey: ['loadAlertingAudit', page, sort],
    queryFn: () => {
      return loadAuditByRuleId({
        http,
        page,
        sort,
        search,
        filter,
      });
    },
    onSuccess: (response) => {
      if (!response?.data?.length && page.index > 0) {
        onPage({ size: page.size, index: 0 });
      }
    },
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.triggersActionsUI.sections.alertingAudit.unableToLoadAuditMessage', {
          defaultMessage: 'Unable to load audit',
        })
      );
    },
    keepPreviousData: true,
    cacheTime: 0,
    retry: false,
  });

  return {
    isLoading: isLoading || isFetching,
    items: data?.data ?? [],
    total: data?.total ?? 0,
    loadAlertingAudit: refetch,
  };
};
