/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DiffableRule } from '../../../../../../../../../common/api/detection_engine';
import { useKibana } from '../../../../../../../../common/lib/kibana';
import { DataSourceType } from '../../../../../../../../../common/api/detection_engine';
import { useDefaultIndexPattern } from '../../../../../../hooks/use_default_index_pattern';

interface UseDiffableRuleDataViewResult {
  dataView: DataView | undefined;
  isLoading: boolean;
}

export function useDiffableRuleDataView(diffableRule: DiffableRule): UseDiffableRuleDataViewResult {
  const {
    data: { dataViews: dataViewsService },
  } = useKibana().services;
  const defaultIndexPattern = useDefaultIndexPattern();
  const [dataView, setDataView] = useState<DataView | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    (async () => {
      if (
        'data_source' in diffableRule &&
        diffableRule.data_source?.type === DataSourceType.index_patterns
      ) {
        const indexPatternsDataView = await dataViewsService.create({
          title: diffableRule.data_source.index_patterns.join(','),
          allowNoIndex: true,
        });

        setDataView(indexPatternsDataView);
        setIsLoading(false);
        return;
      }

      if (
        'data_source' in diffableRule &&
        diffableRule.data_source?.type === DataSourceType.data_view &&
        diffableRule.data_source.data_view_id != null &&
        diffableRule.data_source.data_view_id !== ''
      ) {
        const ruleDataView = await dataViewsService.get(diffableRule.data_source.data_view_id);

        setDataView(ruleDataView);
        setIsLoading(false);
        return;
      }

      const defaultIndexPatternsDataView = await dataViewsService.create({
        title: defaultIndexPattern.join(','),
        allowNoIndex: true,
      });

      setDataView(defaultIndexPatternsDataView);
      setIsLoading(false);
    })();
  }, [dataViewsService, diffableRule, defaultIndexPattern]);

  return { dataView, isLoading };
}
