/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BrowserField } from '@kbn/triggers-actions-ui-plugin/public/application/sections/field_browser/types';
import { ruleRegistryBrowserFieldsMapper } from '@kbn/triggers-actions-ui-plugin/public';
import { useMemo, VFC } from 'react';
import { useKibana } from '../../../../../../hooks';

export interface IndicatorsFieldBrowserProps {
  browserFields: Readonly<Record<string, Partial<BrowserField>>>;
  columnIds: string[];
  onResetColumns: () => void;
  onToggleColumn: (columnId: string) => void;
}

export const IndicatorsFieldBrowser: VFC<IndicatorsFieldBrowserProps> = ({
  browserFields,
  columnIds,
  onResetColumns,
  onToggleColumn,
}) => {
  const { triggersActionsUi } = useKibana().services;

  const triggersActionsUiBrowserFields = useMemo(() => {
    return ruleRegistryBrowserFieldsMapper(browserFields);
  }, [browserFields]);

  return triggersActionsUi.getFieldBrowser({
    browserFields: triggersActionsUiBrowserFields,
    columnIds,
    onResetColumns,
    onToggleColumn,
    options: {
      preselectedCategoryIds: ['threat'],
    },
  });
};
