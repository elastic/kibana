/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiPopoverTitle,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPopover,
  EuiSelect,
  EuiFieldNumber,
  EuiExpression,
  EuiFieldText,
  EuiButtonIcon,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Comparator } from '../../../../../server/lib/alerting/log_threshold/types';

export const Criterion: React.FC = ({
  idx,
  fields,
  criterion,
  updateCriterion,
  removeCriterion,
  canDelete,
  errors,
}) => {
  const [isFieldPopoverOpen, setIsFieldPopoverOpen] = useState(false);
  const [isComparatorPopoverOpen, setIsComparatorPopoverOpen] = useState(false);

  const fieldOptions = useMemo(() => {
    return fields.map(field => {
      return { value: field.name, text: field.name };
    });
  }, [fields]);

  const fieldInfo = useMemo(() => {
    return fields.find(field => {
      return field.name === criterion.field;
    });
  }, [fields, criterion]);

  const compatibleComparatorOptions = useMemo(() => {
    if (fieldInfo.type === 'number') {
      return [
        { value: Comparator.GT, text: Comparator.GT },
        { value: Comparator.GT_OR_EQ, text: Comparator.GT_OR_EQ },
        { value: Comparator.LT, text: Comparator.LT },
        { value: Comparator.LT_OR_EQ, text: Comparator.LT_OR_EQ },
        { value: Comparator.EQ, text: Comparator.EQ },
        { value: Comparator.NOT_EQ, text: Comparator.NOT_EQ },
      ];
    } else if (fieldInfo.aggregatable) {
      return [
        { value: Comparator.EQ, text: Comparator.EQ },
        { value: Comparator.NOT_EQ, text: Comparator.NOT_EQ },
      ];
    } else {
      return [
        { value: Comparator.MATCH, text: Comparator.MATCH },
        { value: Comparator.NOT_MATCH, text: Comparator.NOT_MATCH },
        { value: Comparator.MATCH_PHRASE, text: Comparator.MATCH_PHRASE },
        { value: Comparator.NOT_MATCH_PHRASE, text: Comparator.NOT_MATCH_PHRASE },
      ];
    }
  }, [fieldInfo]);

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiPopover
          id="criterion-field"
          button={
            <EuiExpression
              description={idx === 0 ? 'with' : 'and'}
              uppercase={true}
              value={criterion.field}
              isActive={isFieldPopoverOpen}
              color={errors.field.length === 0 ? 'secondary' : 'danger'}
              onClick={() => setIsFieldPopoverOpen(true)}
            />
          }
          isOpen={isFieldPopoverOpen}
          closePopover={() => setIsFieldPopoverOpen(false)}
          ownFocus
          panelPaddingSize="s"
          anchorPosition="downLeft"
        >
          <div>
            <EuiPopoverTitle>Field</EuiPopoverTitle>
            <EuiFormRow isInvalid={errors.field.length > 0} error={errors.field}>
              <EuiSelect
                compressed
                value={criterion.field}
                onChange={e => updateCriterion(idx, { field: e.target.value })}
                options={fieldOptions}
              />
            </EuiFormRow>
          </div>
        </EuiPopover>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          id="criterion-comparator-value"
          button={
            <EuiExpression
              description={criterion.comparator}
              uppercase={true}
              value={criterion.value}
              isActive={isComparatorPopoverOpen}
              color={
                errors.comparator.length === 0 && errors.value.length === 0 ? 'secondary' : 'danger'
              }
              onClick={() => setIsComparatorPopoverOpen(true)}
            />
          }
          isOpen={isComparatorPopoverOpen}
          closePopover={() => setIsComparatorPopoverOpen(false)}
          ownFocus
          panelPaddingSize="s"
          anchorPosition="downLeft"
        >
          <div>
            <EuiPopoverTitle>Comparison : Value</EuiPopoverTitle>
            <EuiFormRow isInvalid={errors.comparator.length > 0} error={errors.comparator}>
              <EuiSelect
                compressed
                value={criterion.comparator}
                onChange={e => updateCriterion(idx, { comparator: e.target.value })}
                options={compatibleComparatorOptions}
              />
            </EuiFormRow>
            <EuiFormRow isInvalid={errors.value.length > 0} error={errors.value}>
              {fieldInfo.type === 'number' ? (
                <EuiFieldNumber
                  compressed
                  value={criterion.value}
                  onChange={e => {
                    const number = parseInt(e.target.value, 10);
                    updateCriterion(idx, { value: number ? number : undefined });
                  }}
                />
              ) : (
                <EuiFieldText
                  compressed
                  value={criterion.value}
                  onChange={e => updateCriterion(idx, { value: e.target.value })}
                />
              )}
            </EuiFormRow>
          </div>
        </EuiPopover>
      </EuiFlexItem>
      {canDelete && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            aria-label={i18n.translate('xpack.infra.logs.alertFlyout.removeCondition', {
              defaultMessage: 'Remove condition',
            })}
            color={'danger'}
            iconType={'trash'}
            onClick={() => removeCriterion(idx)}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
