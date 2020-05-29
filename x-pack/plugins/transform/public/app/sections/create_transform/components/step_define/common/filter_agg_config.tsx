/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCodeEditor, EuiComboBox, EuiFormRow, EuiSelect } from '@elastic/eui';
import React, { FC, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { debounce } from 'lodash';
import {
  PivotAggsConfigWithExtra,
  PivotAggsConfigWithUiBase,
} from '../../../../../common/pivot_aggs';
import { CreateTransformWizardContext } from '../../wizard/wizard';
import { useApi } from '../../../../../hooks';
import {
  IndexPattern,
  KBN_FIELD_TYPES,
} from '../../../../../../../../../../src/plugins/data/public';
import {
  requiredValidator,
  ValidationResult,
} from '../../../../../../../../ml/common/util/validators';

export const FILTERS = {
  CUSTOM: 'custom',
  PHRASES: 'phrases',
  PHRASE: 'phrase',
  EXISTS: 'exists',
  MATCH_ALL: 'match_all',
  MISSING: 'missing',
  QUERY_STRING: 'query_string',
  RANGE: 'range',
  GEO_BOUNDING_BOX: 'geo_bounding_box',
  GEO_POLYGON: 'geo_polygon',
  SPATIAL_FILTER: 'spatial_filter',
  TERM: 'term',
  TERMS: 'terms',
  BOOL: 'bool',
} as const;

export type FilterAggType = typeof FILTERS[keyof typeof FILTERS];

export const filterAggsFieldSupport: { [key: string]: FilterAggType[] } = {
  [KBN_FIELD_TYPES.ATTACHMENT]: [],
  [KBN_FIELD_TYPES.BOOLEAN]: [],
  [KBN_FIELD_TYPES.DATE]: [FILTERS.RANGE],
  [KBN_FIELD_TYPES.GEO_POINT]: [FILTERS.GEO_BOUNDING_BOX, FILTERS.GEO_POLYGON],
  [KBN_FIELD_TYPES.GEO_SHAPE]: [FILTERS.GEO_BOUNDING_BOX, FILTERS.GEO_POLYGON],
  [KBN_FIELD_TYPES.IP]: [FILTERS.RANGE],
  [KBN_FIELD_TYPES.MURMUR3]: [],
  [KBN_FIELD_TYPES.NUMBER]: [FILTERS.RANGE],
  [KBN_FIELD_TYPES.STRING]: [FILTERS.TERM],
  [KBN_FIELD_TYPES._SOURCE]: [],
  [KBN_FIELD_TYPES.UNKNOWN]: [],
  [KBN_FIELD_TYPES.CONFLICT]: [],
};

interface FilterAggTypeConfig<U> {
  /** Form component */
  FilterAggFormComponent: FilterAggForm<U>;
  /** Filter agg type configuration*/
  filterAggConfig: U;
  /**
   * Mappers for aggregation objects
   */
  esToUiAggConfig: (arg: { [key: string]: any }) => any;
  /** Converts UI agg config form to ES agg request object */
  uiAggConfigToEs: (field?: string) => { [key: string]: any };
}

/** Filter agg type definition */
interface FilterAggProps<T extends FilterAggType, U> {
  /** Filter aggregation type */
  filterAgg: T;
  /** Definition of the filter agg config */
  aggTypeConfig: FilterAggTypeConfig<U>;
  /** Validation result of the entire filter aggregation form */
  validationResult?: ValidationResult;
}

/** Filter term agg */
export type PivotAggConfigFilterTerm = PivotAggsConfigWithExtra<
  FilterAggProps<'term', { value: string }>
>;

/** Filter range agg */
export type PivotAggConfigFilterRange = PivotAggsConfigWithExtra<
  FilterAggProps<'range', { gt?: string; lt?: string; lte?: string; gte?: string }>
>;

/** Union type for filter aggregations */
export type PivotAggsConfigFilter = PivotAggConfigFilterTerm | PivotAggConfigFilterRange;

export function isPivotAggsConfigFilter(arg: any): arg is PivotAggsConfigFilter {
  return arg?.aggConfig?.filterAgg !== undefined;
}

export type PivotAggsConfigFilterInit = Omit<PivotAggsConfigFilter, 'aggConfig'> & {
  aggConfig: {};
};

type FilterAggForm<T> = FC<{
  /** Filter aggregation related configuration */
  config: Partial<T> | undefined;
  /** Callback for configuration updates */
  onChange: (arg: Partial<{ config: Partial<T>; validationResult: ValidationResult }>) => void;
  /** Selected field for the aggregation */
  selectedField?: string;
  validationResult?: ValidationResult;
}>;

/**
 * Gets initial basic configuration of the filter aggregation.
 */
export function getFilterAggConfig(
  commonConfig: PivotAggsConfigWithUiBase
): PivotAggsConfigFilterInit {
  return {
    ...commonConfig,
    AggFormComponent: FilterAggForm,
    aggConfig: {},
    forceEdit: true,
    uiAggConfigToEs() {
      // ensure the configuration has been completed
      if (!isPivotAggsConfigFilter(this)) {
        // eslint-disable-next-line no-console
        console.warn('Config is not ready yet');
        return {};
      }
      const esAgg = this.aggConfig.aggTypeConfig.uiAggConfigToEs(this.field);
      return {
        [this.aggConfig.filterAgg]: esAgg,
      };
    },
    esToUiAggConfig(esAggDefinition: { [key in FilterAggType]: any }) {
      const filterAgg = Object.keys(esAggDefinition)[0] as FilterAggType;
      const config = getFilterAggTypeConfig(filterAgg);

      this.aggConfig = {
        filterAgg,
        aggTypeConfig: config,
      };
    },
  };
}

/**
 * Resolves supported filters for provided field.
 */
export function getSupportedFilterAggs(
  fieldName: string,
  indexPattern: IndexPattern
): FilterAggType[] {
  const field = indexPattern.fields.getByName(fieldName);

  if (field === undefined) {
    throw new Error(`The field ${fieldName} does not exist in the index`);
  }

  return [FILTERS.BOOL, ...filterAggsFieldSupport[field.type]];
}

/**
 * Component for filter aggregation related controls.
 */
export const FilterAggForm: PivotAggsConfigFilter['AggFormComponent'] = ({
  aggConfig,
  onChange,
  selectedField,
}) => {
  const { indexPattern } = useContext(CreateTransformWizardContext);
  const filterAggsOptions = getSupportedFilterAggs(selectedField, indexPattern!);

  const filterAggTypeConfig = isPivotAggsConfigFilter(aggConfig)
    ? aggConfig.aggTypeConfig
    : getFilterAggTypeConfig(aggConfig.filterAgg);

  return (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.transform.agg.popoverForm.filerAggLabel"
            defaultMessage="Filter agg"
          />
        }
      >
        <EuiSelect
          options={[{ text: '', value: '' }].concat(
            filterAggsOptions.map((v) => ({ text: v, value: v }))
          )}
          value={aggConfig.filterAgg}
          onChange={(e) => {
            onChange({
              ...aggConfig,
              filterAgg: e.target.value as FilterAggType,
            });
          }}
        />
      </EuiFormRow>
      {aggConfig.filterAgg && (
        <filterAggTypeConfig.FilterAggFormComponent
          config={aggConfig.aggTypeConfig?.filterAggConfig}
          onChange={(update) => {
            onChange({
              ...aggConfig,
              validationResult: update.validationResult,
              aggTypeConfig: {
                ...filterAggTypeConfig,
                filterAggConfig: update.config,
              },
            });
          }}
          selectedField={selectedField}
        />
      )}
    </>
  );
};

/**
 * Returns a form component for provided filter aggregation type.
 */
export function getFilterAggTypeConfig(
  filterAggType?: FilterAggType
): PivotAggsConfigFilter['aggConfig']['aggTypeConfig'] {
  switch (filterAggType) {
    case FILTERS.TERM:
      return {
        FilterAggFormComponent: FilterTermForm,
        filterAggConfig: {
          value: '',
        },
        esToUiAggConfig() {},
        uiAggConfigToEs(fieldName: string) {
          return {
            [fieldName]: this.filterAggConfig.value,
          };
        },
      };
    case FILTERS.RANGE:
      return {
        FilterAggFormComponent: FilterRangeForm,
        esToUiAggConfig() {},
        uiAggConfigToEs() {},
      };
    default:
      return {
        FilterAggFormComponent: FilterEditorForm,
        esToUiAggConfig() {},
        uiAggConfigToEs() {},
      };
  }
}

/**
 * Form component for the term filter aggregation.
 */
export const FilterTermForm: PivotAggConfigFilterTerm['aggConfig']['aggTypeConfig']['FilterAggFormComponent'] = ({
  config,
  validationResult,
  onChange,
  selectedField,
}) => {
  const api = useApi();
  const { indexPattern } = useContext(CreateTransformWizardContext);

  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const validators = useMemo(() => requiredValidator(), []);

  const onSearchChange = useCallback(
    (searchValue) => {
      setIsLoading(true);
      setOptions([]);

      const esSearchRequest = {
        index: indexPattern!.title,
        body: {
          query: {
            wildcard: {
              region: {
                value: `*${searchValue}*`,
              },
            },
          },
          aggs: {
            field_values: {
              terms: {
                field: selectedField,
                size: 10,
              },
            },
          },
          size: 0,
        },
      };

      api.esSearch(esSearchRequest).then((response) => {
        setOptions(
          response.aggregations.field_values.buckets.map(
            (value: { key: string; doc_count: number }) => ({ label: value.key })
          )
        );
        setIsLoading(false);
      });
    },
    [api, indexPattern, selectedField]
  );

  useEffect(() => {
    // Simulate initial load.
    onSearchChange('');
  }, [onSearchChange]);

  const selectedOptions = config?.value ? [{ label: config.value }] : undefined;

  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.transform.agg.popoverForm.filerAgg.term.valueLabel"
          defaultMessage="Value"
        />
      }
    >
      <EuiComboBox
        async
        isLoading={isLoading}
        fullWidth
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selectedOptions}
        isClearable={false}
        onChange={(selected) => {
          onChange({
            config: {
              value: selected[0].label,
            },
            validationResult: validators(selected[0].label),
          });
        }}
        onSearchChange={debounce(onSearchChange, 600)}
        data-test-subj="filterTermValueSelection"
      />
    </EuiFormRow>
  );
};

/**
 * Form component for the range filter aggregation.
 */
export const FilterRangeForm: PivotAggConfigFilterRange['aggConfig']['aggTypeConfig']['FilterAggFormComponent'] = ({
  config,
  onChange,
}) => {
  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.transform.agg.popoverForm.filerAgg.term.valueLabel"
          defaultMessage="Value"
        />
      }
    >
      <EuiComboBox
        fullWidth
        singleSelection={{ asPlainText: true }}
        options={[]}
        selectedOptions={[]}
        isClearable={false}
        data-test-subj="filterRangeValueSelection"
      />
    </EuiFormRow>
  );
};

export const FilterEditorForm: FC = () => {
  return <EuiCodeEditor value={''} mode="json" style={{ width: '100%' }} theme="textmate" />;
};
