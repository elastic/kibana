/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo, useCallback } from 'react';
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
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IFieldType } from 'src/plugins/data/public';
import { ExpressionRowLabel } from '../../../../alerting/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IErrorObject } from '../../../../../../triggers_actions_ui/public/types';
import {
  Comparator,
  Criterion as CriterionType,
  ComparatorToi18nMap,
} from '../../../../../common/alerting/logs/types';

const firstCriterionFieldPrefix = (documentCount: number = 0) =>
  i18n.translate('xpack.infra.logs.alertFlyout.firstCriterionFieldPrefix', {
    defaultMessage: '{documentCount, plural, one {occurs with} other {occur with}}',
    values: { documentCount },
  });

const successiveCriterionFieldPrefix = i18n.translate(
  'xpack.infra.logs.alertFlyout.successiveCriterionFieldPrefix',
  {
    defaultMessage: 'and',
  }
);

const criterionFieldTitle = i18n.translate('xpack.infra.logs.alertFlyout.criterionFieldTitle', {
  defaultMessage: 'Field',
});

const criterionComparatorValueTitle = i18n.translate(
  'xpack.infra.logs.alertFlyout.criterionComparatorValueTitle',
  {
    defaultMessage: 'Comparison : Value',
  }
);

const getCompatibleComparatorsForField = (fieldInfo: IFieldType | undefined) => {
  if (fieldInfo?.type === 'number') {
    return [
      { value: Comparator.GT, text: ComparatorToi18nMap[Comparator.GT] },
      { value: Comparator.GT_OR_EQ, text: ComparatorToi18nMap[Comparator.GT_OR_EQ] },
      { value: Comparator.LT, text: ComparatorToi18nMap[Comparator.LT] },
      { value: Comparator.LT_OR_EQ, text: ComparatorToi18nMap[Comparator.LT_OR_EQ] },
      { value: Comparator.EQ, text: ComparatorToi18nMap[`${Comparator.EQ}:number`] },
      { value: Comparator.NOT_EQ, text: ComparatorToi18nMap[`${Comparator.NOT_EQ}:number`] },
    ];
  } else if (fieldInfo?.aggregatable) {
    return [
      { value: Comparator.EQ, text: ComparatorToi18nMap[Comparator.EQ] },
      { value: Comparator.NOT_EQ, text: ComparatorToi18nMap[Comparator.NOT_EQ] },
    ];
  } else {
    return [
      { value: Comparator.MATCH, text: ComparatorToi18nMap[Comparator.MATCH] },
      { value: Comparator.NOT_MATCH, text: ComparatorToi18nMap[Comparator.NOT_MATCH] },
      { value: Comparator.MATCH_PHRASE, text: ComparatorToi18nMap[Comparator.MATCH_PHRASE] },
      {
        value: Comparator.NOT_MATCH_PHRASE,
        text: ComparatorToi18nMap[Comparator.NOT_MATCH_PHRASE],
      },
    ];
  }
};

const getFieldInfo = (fields: IFieldType[], fieldName: string): IFieldType | undefined => {
  return fields.find((field) => {
    return field.name === fieldName;
  });
};

interface Props {
  idx: number;
  fields: IFieldType[];
  criterion: CriterionType;
  updateCriterion: (idx: number, params: Partial<CriterionType>) => void;
  removeCriterion: (idx: number) => void;
  canDelete: boolean;
  errors: IErrorObject;
  documentCount?: number;
  label: string | null;
}

export const Criterion: React.FC<Props> = ({
  idx,
  fields,
  criterion,
  updateCriterion,
  removeCriterion,
  canDelete,
  errors,
  documentCount,
  label,
}) => {
  const [isFieldPopoverOpen, setIsFieldPopoverOpen] = useState(false);
  const [isComparatorPopoverOpen, setIsComparatorPopoverOpen] = useState(false);

  const fieldOptions = useMemo(() => {
    return fields.map((field) => {
      return { value: field.name, text: field.name };
    });
  }, [fields]);

  const fieldInfo: IFieldType | undefined = useMemo(() => {
    return getFieldInfo(fields, criterion.field);
  }, [fields, criterion]);

  const compatibleComparatorOptions = useMemo(() => {
    return getCompatibleComparatorsForField(fieldInfo);
  }, [fieldInfo]);

  const handleFieldChange = useCallback(
    (e) => {
      const fieldName = e.target.value;
      const nextFieldInfo = getFieldInfo(fields, fieldName);
      // If the field information we're dealing with has changed, reset the comparator and value.
      if (
        fieldInfo &&
        nextFieldInfo &&
        (fieldInfo.type !== nextFieldInfo.type ||
          fieldInfo.aggregatable !== nextFieldInfo.aggregatable)
      ) {
        const compatibleComparators = getCompatibleComparatorsForField(nextFieldInfo);
        updateCriterion(idx, {
          field: fieldName,
          comparator: compatibleComparators[0].value,
          value: undefined,
        });
      } else {
        updateCriterion(idx, { field: fieldName });
      }
    },
    [fieldInfo, fields, idx, updateCriterion]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="s">
        {label && (
          <ExpressionRowLabel>
            <label htmlFor={`expression-${label}`}>{label}</label>
          </ExpressionRowLabel>
        )}
        <EuiFlexItem grow id={`expression-${label}`}>
          <EuiPopover
            id="criterion-field"
            button={
              <EuiExpression
                description={
                  idx === 0
                    ? firstCriterionFieldPrefix(documentCount)
                    : successiveCriterionFieldPrefix
                }
                uppercase={true}
                value={criterion.field}
                isActive={isFieldPopoverOpen}
                color={errors.field.length === 0 ? 'secondary' : 'danger'}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFieldPopoverOpen(true);
                }}
                display="columns"
              />
            }
            isOpen={isFieldPopoverOpen}
            closePopover={() => setIsFieldPopoverOpen(false)}
            ownFocus
            panelPaddingSize="s"
            anchorPosition="downLeft"
            display="block"
          >
            <div>
              <EuiPopoverTitle>{criterionFieldTitle}</EuiPopoverTitle>
              <EuiFormRow isInvalid={errors.field.length > 0} error={errors.field}>
                <EuiSelect
                  compressed
                  value={criterion.field}
                  onChange={handleFieldChange}
                  options={fieldOptions}
                />
              </EuiFormRow>
            </div>
          </EuiPopover>

          <EuiPopover
            id="criterion-comparator-value"
            button={
              <EuiExpression
                description={
                  ComparatorToi18nMap[`${criterion.comparator}:${fieldInfo?.type}`]
                    ? ComparatorToi18nMap[`${criterion.comparator}:${fieldInfo?.type}`]
                    : ComparatorToi18nMap[criterion.comparator]
                }
                uppercase={true}
                value={criterion.value}
                isActive={isComparatorPopoverOpen}
                color={
                  errors.comparator.length === 0 && errors.value.length === 0
                    ? 'secondary'
                    : 'danger'
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setIsComparatorPopoverOpen(true);
                }}
                display="columns"
              />
            }
            isOpen={isComparatorPopoverOpen}
            closePopover={() => setIsComparatorPopoverOpen(false)}
            ownFocus
            panelPaddingSize="s"
            anchorPosition="downLeft"
            display="block"
          >
            <div>
              <EuiPopoverTitle>{criterionComparatorValueTitle}</EuiPopoverTitle>
              <EuiFlexGroup gutterSize="l">
                <EuiFlexItem grow={false}>
                  <EuiFormRow isInvalid={errors.comparator.length > 0} error={errors.comparator}>
                    <EuiSelect
                      compressed
                      value={criterion.comparator}
                      onChange={(e) =>
                        updateCriterion(idx, { comparator: e.target.value as Comparator })
                      }
                      options={compatibleComparatorOptions}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFormRow isInvalid={errors.value.length > 0} error={errors.value}>
                    {fieldInfo?.type === 'number' ? (
                      <EuiFieldNumber
                        compressed
                        value={criterion.value as number | undefined}
                        onChange={(e) => {
                          const number = parseInt(e.target.value, 10);
                          updateCriterion(idx, { value: number ? number : undefined });
                        }}
                      />
                    ) : (
                      <EuiFieldText
                        compressed
                        value={criterion.value}
                        onChange={(e) => updateCriterion(idx, { value: e.target.value })}
                      />
                    )}
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
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
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                removeCriterion(idx);
              }}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {label && <EuiSpacer size="xs" />}
    </>
  );
};
