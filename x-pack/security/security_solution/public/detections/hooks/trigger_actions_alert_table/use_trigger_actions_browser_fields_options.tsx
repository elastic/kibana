/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsTableConfigurationRegistry } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useFieldBrowserOptions } from '../../../timelines/components/fields_browser';
import type { SourcererScopeName } from '../../../common/store/sourcerer/model';

export const getUseTriggersActionsFieldBrowserOptions = (scopeId: SourcererScopeName) => {
  const useTriggersActionsFieldBrowserOptions: AlertsTableConfigurationRegistry['useFieldBrowserOptions'] =
    ({ onToggleColumn }) => {
      const options = useFieldBrowserOptions({
        sourcererScope: scopeId,
        removeColumn: onToggleColumn,
        upsertColumn: (column) => {
          onToggleColumn(column.id);
        },
      });

      return {
        createFieldButton: options.createFieldButton,
      };
    };

  return useTriggersActionsFieldBrowserOptions;
};
