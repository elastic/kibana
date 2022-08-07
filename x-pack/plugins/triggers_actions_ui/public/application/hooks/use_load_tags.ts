/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useState, useCallback, useMemo } from 'react';
import { loadRuleTags } from '../lib/rule_api';
import { useKibana } from '../../common/lib/kibana';

interface UseLoadTagsProps {
  onError: (message: string) => void;
}

export function useLoadTags(props: UseLoadTagsProps) {
  const { onError } = props;
  const { http } = useKibana().services;
  const [tags, setTags] = useState<string[]>([]);

  const internalLoadTags = useCallback(async () => {
    try {
      const ruleTagsAggs = await loadRuleTags({ http });
      if (ruleTagsAggs?.ruleTags) {
        setTags(ruleTagsAggs.ruleTags);
      }
    } catch (e) {
      onError(
        i18n.translate('xpack.triggersActionsUI.sections.rulesList.unableToLoadRuleTags', {
          defaultMessage: 'Unable to load rule tags',
        })
      );
    }
  }, [http, setTags, onError]);

  return useMemo(
    () => ({
      tags,
      loadTags: internalLoadTags,
      setTags,
    }),
    [tags, internalLoadTags, setTags]
  );
}
