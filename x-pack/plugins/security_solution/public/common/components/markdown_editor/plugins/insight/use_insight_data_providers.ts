/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { QueryOperator, DataProvider } from '@kbn/timelines-plugin/common';
import { DataProviderType } from '@kbn/timelines-plugin/common';
import { IS_OPERATOR } from '../../../../../timelines/components/timeline/data_providers/data_provider';
import type { TimelineEventsDetailsItem } from '../../../../../../common/search_strategy';

export interface Provider {
  field: string;
  value: string;
  type: 'parameter' | 'value';
}
export interface UseInsightDataProvidersProps {
  providers: Provider[][];
  alertData?: TimelineEventsDetailsItem[] | null;
}

export const useInsightDataProviders = ({
  providers,
  alertData,
}: UseInsightDataProvidersProps): DataProvider[] => {
  function getFieldValue(fields: TimelineEventsDetailsItem[], fieldToFind: string) {
    const alertField = fields.find((dataField) => dataField.field === fieldToFind);
    return alertField?.values ? alertField.values[0] : '*';
  }
  const dataProviders: DataProvider[] = useMemo(() => {
    if (alertData) {
      return providers.map((innerProvider) => {
        return innerProvider.reduce((prev, next, index): DataProvider => {
          const { field, value, type } = next;
          if (index === 0) {
            return {
              and: [],
              enabled: true,
              id: JSON.stringify(field + value + type),
              name: field,
              excluded: false,
              kqlQuery: '',
              type: DataProviderType.default,
              queryMatch: {
                field,
                value: type === 'parameter' ? getFieldValue(alertData, value) : value,
                operator: IS_OPERATOR as QueryOperator,
              },
            };
          } else {
            const newProvider = {
              and: [],
              enabled: true,
              id: JSON.stringify(field + value + type),
              name: field,
              excluded: false,
              kqlQuery: '',
              type: DataProviderType.default,
              queryMatch: {
                field,
                value: type === 'parameter' ? getFieldValue(alertData, value) : value,
                operator: IS_OPERATOR as QueryOperator,
              },
            };
            prev.and.push(newProvider);
          }
          return prev;
        }, {} as DataProvider);
      });
    } else {
      return providers.map((innerProvider) => {
        return innerProvider.reduce((prev, next, index) => {
          const { field, value, type } = next;
          if (index === 0) {
            return {
              and: [],
              enabled: true,
              id: JSON.stringify(field + value + type),
              name: field,
              excluded: false,
              kqlQuery: '',
              type: type === 'parameter' ? DataProviderType.template : DataProviderType.default,
              queryMatch: {
                field,
                value: type === 'parameter' ? `{${value}}` : value,
                operator: IS_OPERATOR as QueryOperator,
              },
            };
          } else {
            const newProvider = {
              and: [],
              enabled: true,
              id: JSON.stringify(field + value + type),
              name: field,
              excluded: false,
              kqlQuery: '',
              type: type === 'parameter' ? DataProviderType.template : DataProviderType.default,
              queryMatch: {
                field,
                value: type === 'parameter' ? `{${value}}` : value,
                operator: IS_OPERATOR as QueryOperator,
              },
            };
            prev.and.push(newProvider);
          }
          return prev;
        }, {} as DataProvider);
      });
    }
  }, [alertData, providers]);
  return dataProviders;
};
