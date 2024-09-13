/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ControlGroupRuntimeState } from '@kbn/controls-plugin/public';
import type { DefaultControlState } from '@kbn/controls-plugin/public/react_controls/controls/types';
import type { Storage } from '@kbn/kibana-utils-plugin/public';

export const PAGE_FILTER_STORAGE_KEY = 'siem.default.pageFilters';

interface OldFormat {
  viewMode: string;
  id: string;
  panels: {
    [key: string]: {
      type: string;
      order: number;
      grow: boolean;
      width: string;
      explicitInput: {
        id: string;
        dataViewId: string;
        fieldName: string;
        title: string;
        hideExclude: boolean;
        hideSort: boolean;
        hidePanelTitles: boolean;
        placeholder: string;
        ignoreParentSettings: {
          ignoreValidations: boolean;
        };
        selectedOptions: string[];
        hideActionBar: boolean;
        persist: boolean;
        hideExists: boolean;
        existsSelected: boolean;
        exclude: boolean;
      };
    };
  };
  defaultControlWidth: string;
  defaultControlGrow: boolean;
  controlStyle: string;
  chainingSystem: string;
  showApplySelections: boolean;
  ignoreParentSettings: {
    ignoreFilters: boolean;
    ignoreQuery: boolean;
    ignoreTimerange: boolean;
    ignoreValidations: boolean;
  };
  timeRange: {
    from: string;
    to: string;
    mode: string;
  };
  filters: Array<{
    meta: {
      alias: null;
      negate: boolean;
      disabled: boolean;
      type: string;
      key: string;
      index: string;
    };
    query: {
      exists: {
        field: string;
      };
    };
  }>;
  query: {
    query: string;
  };
}

interface NewFormatExplicitInput {
  dataViewId: string;
  fieldName: string;
  title: string;
  hideExclude: boolean;
  hideSort: boolean;
  placeholder: string;
  selectedOptions: string[];
  hideActionBar: boolean;
  persist: boolean;
  hideExists: boolean;
}

/**
 * Ref PR : https://github.com/elastic/kibana/pull/190561
 *
 * The above PR breaks the local storage format of page filters controls.
 * This migration script is to migrate the old format to the new format.
 *
 */
export function migrateAlertPageControlsTo816(storage: Storage) {
  const oldFormat: OldFormat = storage.get(PAGE_FILTER_STORAGE_KEY);
  if (oldFormat && Object.keys(oldFormat).includes('panels')) {
    // Only run when it is old format
    const newFormat: ControlGroupRuntimeState<NewFormatExplicitInput & DefaultControlState> = {
      initialChildControlState: {},
      labelPosition: oldFormat.controlStyle as ControlGroupRuntimeState['labelPosition'],
      chainingSystem: oldFormat.chainingSystem as ControlGroupRuntimeState['chainingSystem'],
      autoApplySelections: oldFormat.showApplySelections ?? true,
      ignoreParentSettings: oldFormat.ignoreParentSettings,
      editorConfig: {
        hideWidthSettings: true,
        hideDataViewSelector: true,
        hideAdditionalSettings: true,
      },
    };

    for (const [key, value] of Object.entries(oldFormat.panels)) {
      newFormat.initialChildControlState[key] = {
        type: 'optionsListControl',
        order: value.order,
        hideExclude: value.explicitInput.hideExclude ?? true,
        hideSort: value.explicitInput.hideSort ?? true,
        placeholder: value.explicitInput.placeholder ?? '',
        width: value.width as DefaultControlState['width'],
        dataViewId: value.explicitInput.dataViewId ?? 'security_solution_alerts_dv',
        title: value.explicitInput.title,
        fieldName: value.explicitInput.fieldName,
        selectedOptions: value.explicitInput.selectedOptions,
        hideActionBar: value.explicitInput.hideActionBar,
        persist: value.explicitInput.persist,
        hideExists: value.explicitInput.hideExists,
      };
    }

    storage.set(PAGE_FILTER_STORAGE_KEY, newFormat);
  }
}
