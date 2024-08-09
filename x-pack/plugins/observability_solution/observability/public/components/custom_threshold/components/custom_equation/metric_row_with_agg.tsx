/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiExpression,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiSelect,
} from '@elastic/eui';
import { DataViewBase } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ValidNormalizedTypes } from '@kbn/triggers-actions-ui-plugin/public';
import { get } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { Aggregators } from '../../../../../common/custom_threshold_rule/types';
import { RuleFlyoutKueryBar } from '../../../rule_kql_filter/kuery_bar';
import { ClosablePopoverTitle } from '../closable_popover_title';
import { MetricRowControls } from './metric_row_controls';
import { MetricRowBaseProps, NormalizedFields } from './types';

interface MetricRowWithAggProps extends MetricRowBaseProps {
  aggType?: Aggregators;
  field?: string;
  dataView: DataViewBase;
  filter?: string;
  fields: NormalizedFields;
}

const DEFAULT_COUNT_FILTER_TITLE = i18n.translate(
  'xpack.observability.customThreshold.rule.alertFlyout.customEquationEditor.defaultCountFilterTitle',
  { defaultMessage: 'all documents' }
);

export function MetricRowWithAgg({
  name,
  aggType = Aggregators.COUNT,
  field,
  onDelete,
  dataView,
  filter,
  disableDelete,
  fields,
  aggregationTypes,
  onChange,
  errors,
}: MetricRowWithAggProps) {
  const handleDelete = useCallback(() => {
    onDelete(name);
  }, [name, onDelete]);

  const [aggTypePopoverOpen, setAggTypePopoverOpen] = useState(false);

  const fieldOptions = useMemo(
    () =>
      fields.reduce((acc, fieldValue) => {
        if (
          aggType &&
          aggregationTypes[aggType].validNormalizedTypes.includes(
            fieldValue.normalizedType as ValidNormalizedTypes
          )
        ) {
          if (aggType === Aggregators.LAST_VALUE) {
            if (!fieldValue.esTypes?.includes(ES_FIELD_TYPES.AGGREGATE_METRIC_DOUBLE)) {
              acc.push({ label: fieldValue.name });
            }
          } else {
            acc.push({ label: fieldValue.name });
          }
        }
        return acc;
      }, [] as Array<{ label: string }>),
    [fields, aggregationTypes, aggType]
  );

  const handleFieldChange = useCallback(
    (selectedOptions: EuiComboBoxOptionOption[]) => {
      onChange({
        name,
        field: (selectedOptions.length && selectedOptions[0].label) || undefined,
        aggType,
      });
    },
    [name, aggType, onChange]
  );

  const handleAggChange = useCallback(
    (customAggType: string) => {
      onChange({
        name,
        field: customAggType === Aggregators.COUNT ? undefined : field,
        aggType: customAggType as Aggregators,
      });
    },
    [name, field, onChange]
  );

  const handleFilterChange = useCallback(
    (filterString: string) => {
      onChange({
        name,
        filter: filterString,
        aggType,
      });
    },
    [name, aggType, onChange]
  );

  const isAggInvalid = get(errors, ['metrics', name, 'aggType']) != null;
  const isFieldInvalid = get(errors, ['metrics', name, 'field']) != null || !field;

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="flexEnd">
      <EuiFlexItem grow>
        <EuiPopover
          button={
            <EuiFormRow
              fullWidth
              label={
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false} css={{ paddingTop: 2, paddingBottom: 2 }}>
                    {i18n.translate(
                      'xpack.observability.customThreshold.rule.alertFlyout.customEquationEditor.aggregationLabel',
                      { defaultMessage: 'Aggregation {name}', values: { name } }
                    )}
                  </EuiFlexItem>
                  {!disableDelete && (
                    <EuiFlexItem grow={false}>
                      <MetricRowControls onDelete={handleDelete} disableDelete={disableDelete} />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              }
            >
              <EuiExpression
                data-test-subj="aggregationName"
                description={aggregationTypes[aggType].text}
                value={aggType === Aggregators.COUNT ? filter || DEFAULT_COUNT_FILTER_TITLE : field}
                isActive={aggTypePopoverOpen}
                display="columns"
                onClick={() => {
                  setAggTypePopoverOpen(true);
                }}
                isInvalid={aggType !== Aggregators.COUNT && !field}
              />
            </EuiFormRow>
          }
          isOpen={aggTypePopoverOpen}
          closePopover={() => {
            setAggTypePopoverOpen(false);
          }}
          display="block"
          ownFocus
          anchorPosition={'downLeft'}
          repositionOnScroll
        >
          <div>
            <ClosablePopoverTitle onClose={() => setAggTypePopoverOpen(false)}>
              <FormattedMessage
                id="xpack.observability.customThreshold.rule.alertFlyout.customEquationEditor.aggregationLabel"
                defaultMessage="Aggregation {name}"
                values={{ name }}
              />
            </ClosablePopoverTitle>

            <EuiFlexGroup gutterSize="l" alignItems="flexEnd">
              <EuiFlexItem grow>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.observability.customThreshold.rule.alertFlyout.customEquationEditor.aggregationType',
                    { defaultMessage: 'Aggregation type' }
                  )}
                >
                  <EuiSelect
                    data-test-subj="aggregationTypeSelect"
                    id="aggTypeField"
                    value={aggType}
                    fullWidth
                    onChange={(e) => {
                      handleAggChange(e.target.value);
                    }}
                    options={Object.values(aggregationTypes).map(({ text, value }) => {
                      return {
                        text,
                        value,
                      };
                    })}
                    isInvalid={isAggInvalid}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem style={{ minWidth: 300 }}>
                {aggType === Aggregators.COUNT ? (
                  <EuiFormRow
                    label={i18n.translate(
                      'xpack.observability.customThreshold.rule.alertFlyout.customEquationEditor.filterLabel',
                      { defaultMessage: 'KQL Filter {name}', values: { name } }
                    )}
                  >
                    <RuleFlyoutKueryBar
                      placeholder={' '}
                      derivedIndexPattern={dataView}
                      onChange={handleFilterChange}
                      onSubmit={handleFilterChange}
                      value={filter}
                    />
                  </EuiFormRow>
                ) : (
                  <EuiFormRow
                    label={i18n.translate(
                      'xpack.observability.customThreshold.rule.alertFlyout.customEquationEditor.fieldLabel',
                      { defaultMessage: 'Field name' }
                    )}
                  >
                    <EuiComboBox
                      fullWidth
                      isInvalid={isFieldInvalid}
                      singleSelection={{ asPlainText: true }}
                      options={fieldOptions}
                      selectedOptions={field ? [{ label: field }] : []}
                      onChange={handleFieldChange}
                    />
                  </EuiFormRow>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
