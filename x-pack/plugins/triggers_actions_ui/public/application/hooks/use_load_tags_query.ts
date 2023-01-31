/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { loadRuleTags } from '../lib/rule_api';
import { useKibana } from '../../common/lib/kibana';

interface UseLoadTagsQueryProps {
  enabled: boolean;
  refresh?: Date;
}

export function useLoadTagsQuery(props: UseLoadTagsQueryProps) {
  const { enabled, refresh } = props;

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const queryFn = () => {
    return loadRuleTags({ http });
  };

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate('xpack.triggersActionsUI.sections.rulesList.unableToLoadRuleTags', {
        defaultMessage: 'Unable to load rule tags',
      })
    );
  };

  const { refetch, data } = useQuery({
    queryKey: [
      'loadRuleTags',
      {
        refresh: refresh?.toDateString(),
      },
    ],
    queryFn,
    onError: onErrorFn,
    enabled,
  });

  return {
    tags: data?.ruleTags ?? [],
    loadTags: refetch,
  };
}
