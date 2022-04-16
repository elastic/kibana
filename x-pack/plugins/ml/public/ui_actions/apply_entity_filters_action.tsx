/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { FilterStateStore } from '@kbn/data-plugin/common';
import { MlCoreSetup } from '../plugin';
import {
  ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
  AnomalyChartsFieldSelectionContext,
} from '../embeddables';
import { CONTROLLED_BY_ANOMALY_CHARTS_FILTER } from './constants';
import { ENTITY_FIELD_OPERATIONS } from '../../common/util/anomaly_utils';

export const APPLY_ENTITY_FIELD_FILTERS_ACTION = 'applyEntityFieldFiltersAction';

export function createApplyEntityFieldFiltersAction(
  getStartServices: MlCoreSetup['getStartServices']
) {
  return createAction<AnomalyChartsFieldSelectionContext>({
    id: 'apply-entity-field-filters',
    type: APPLY_ENTITY_FIELD_FILTERS_ACTION,
    getIconType(context: AnomalyChartsFieldSelectionContext): string {
      return 'filter';
    },
    getDisplayName() {
      return i18n.translate('xpack.ml.actions.applyEntityFieldsFiltersTitle', {
        defaultMessage: 'Filter for value',
      });
    },
    async execute({ data }) {
      if (!data) {
        throw new Error('No entities provided');
      }
      const [, pluginStart] = await getStartServices();
      const filterManager = pluginStart.data.query.filterManager;

      filterManager.addFilters(
        data
          .filter((d) => d.operation === ENTITY_FIELD_OPERATIONS.ADD)
          .map<Filter>(({ fieldName, fieldValue }) => {
            return {
              $state: {
                store: FilterStateStore.APP_STATE,
              },
              meta: {
                alias: i18n.translate('xpack.ml.actions.entityFieldFilterAliasLabel', {
                  defaultMessage: '{labelValue}',
                  values: {
                    labelValue: `${fieldName}:${fieldValue}`,
                  },
                }),
                controlledBy: CONTROLLED_BY_ANOMALY_CHARTS_FILTER,
                negate: false,
                disabled: false,
                type: 'phrase',
                key: fieldName,
                params: {
                  query: fieldValue,
                },
              },
              query: {
                match_phrase: {
                  [fieldName]: fieldValue,
                },
              },
            };
          })
      );

      data
        .filter((field) => field.operation === ENTITY_FIELD_OPERATIONS.REMOVE)
        .forEach((field) => {
          const filter = filterManager
            .getFilters()
            .find(
              (f) => f.meta.key === field.fieldName && f.meta.params.query === field.fieldValue
            );
          if (filter) {
            filterManager.removeFilter(filter);
          }
        });
    },
    async isCompatible({ embeddable, data }) {
      return embeddable.type === ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE && data !== undefined;
    },
  });
}
