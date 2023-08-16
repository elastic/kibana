/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSelect,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiPopover,
  EuiExpression,
} from '@elastic/eui';
import React, { useMemo, useCallback, useState } from 'react';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { ValidNormalizedTypes } from '@kbn/triggers-actions-ui-plugin/public';
import { DataViewBase } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { Aggregators, CustomMetricAggTypes } from '../../../../../common/threshold_rule/types';
import { MetricRowControls } from './metric_row_controls';
import { NormalizedFields, MetricRowBaseProps } from './types';
import { ClosablePopoverTitle } from '../closable_popover_title';
import { RuleFlyoutKueryBar } from '../../../rule_kql_filter/kuery_bar';

interface MetricRowWithAggProps extends MetricRowBaseProps {
  aggType?: CustomMetricAggTypes;
  field?: string;
  dataView: DataViewBase;
  filter?: string;
  fields: NormalizedFields;
}

export function MetricRowWithAgg({
  name,
  aggType = Aggregators.AVERAGE,
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
          acc.push({ label: fieldValue.name });
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
        field,
        aggType: customAggType as CustomMetricAggTypes,
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

  const isAggInvalid = get(errors, ['customMetrics', name, 'aggType']) != null;
  const isFieldInvalid = get(errors, ['customMetrics', name, 'field']) != null || !field;

  return (
    <>
      <EuiFlexGroup gutterSize="xs" alignItems="flexEnd">
        <EuiFlexItem grow>
          <EuiPopover
            button={
              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.observability.threshold.rule.alertFlyout.customEquationEditor.aggregationLabel',
                  { defaultMessage: 'Aggregation {name}', values: { name } }
                )}
                isInvalid={aggType !== Aggregators.COUNT && !field}
              >
                <EuiExpression
                  data-test-subj="aggregationName"
                  description={aggregationTypes[aggType].text}
                  value={aggType === Aggregators.COUNT ? filter : field}
                  isActive={aggTypePopoverOpen}
                  display={'columns'}
                  onClick={() => {
                    setAggTypePopoverOpen(true);
                  }}
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
                  id="xpack.observability.threshold.rule.alertFlyout.customEquationEditor.aggregationLabel"
                  defaultMessage="Aggregation {name}"
                  values={{ name }}
                />
              </ClosablePopoverTitle>

              <EuiFlexGroup gutterSize="l" alignItems="flexEnd">
                <EuiFlexItem grow>
                  <EuiFormRow
                    label={i18n.translate(
                      'xpack.observability.threshold.rule.alertFlyout.customEquationEditor.aggregationType',
                      { defaultMessage: 'Aggregation type' }
                    )}
                    isInvalid={isAggInvalid}
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
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem style={{ minWidth: 300 }}>
                  {aggType === Aggregators.COUNT ? (
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.observability.threshold.rule.alertFlyout.customEquationEditor.filterLabel',
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
                        'xpack.observability.threshold.rule.alertFlyout.customEquationEditor.fieldLabel',
                        { defaultMessage: 'Field name' }
                      )}
                      isInvalid={isFieldInvalid}
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
        <MetricRowControls onDelete={handleDelete} disableDelete={disableDelete} />
      </EuiFlexGroup>
    </>
  );
}
