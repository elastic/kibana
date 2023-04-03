/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { startCase } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiComboBox,
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { RuleTableItem } from '../../../../types';
import { useGetRuleParamsFromRuleItems } from '../hooks/use_get_rule_params_from_rule_items';

export interface Props {
  ruleItems: RuleTableItem[];
  filters: Record<string, string | number>;
  onChange: (selectedParams: Record<string, string | number>) => void;
}

export const RuleParamsFilter = ({ filters, ruleItems, onChange }: Props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const paramsForRules = useGetRuleParamsFromRuleItems({ ruleItems });

  const handleButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const handleChange = (param: string, value: string | number | undefined) => {
    const newFilters = { ...filters, [param]: value };

    if (value === undefined) {
      delete newFilters[param];
    }

    onChange(newFilters as Record<string, string | number>);

    setIsPopoverOpen(!isPopoverOpen);
  };

  const findLabel = (param: string, value: string | number) => {
    return paramsForRules[param].find((item) => item.value === value)?.label || '';
  };

  return (
    <EuiPopover
      anchorPosition="downCenter"
      button={
        <EuiFilterButton
          iconType="arrowDown"
          onClick={handleButtonClick}
          numFilters={Object.keys(filters).length}
          hasActiveFilters={Boolean(Object.keys(filters).length)}
        >
          {i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.ruleParamsFilter.popOverButton',
            {
              defaultMessage: 'Properties',
            }
          )}
        </EuiFilterButton>
      }
      isOpen={isPopoverOpen}
      closePopover={handleButtonClick}
      panelPaddingSize="m"
    >
      <div style={{ maxWidth: '700px' }}>
        <EuiPopoverTitle>
          {i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.ruleParamsFilter.ruleProperties',
            {
              defaultMessage: 'Rule Properties',
            }
          )}
        </EuiPopoverTitle>
        <EuiFlexGroup wrap>
          {Object.keys(paramsForRules).map((param) => {
            return (
              <EuiFlexItem key={param} style={{ minWidth: '200px', maxWidth: '200px' }}>
                <EuiFormRow label={startCase(param).replace('id', '')}>
                  <EuiComboBox
                    placeholder={i18n.translate(
                      'xpack.triggersActionsUI.sections.rulesList.ruleParamsFilter.valueSelect',
                      {
                        defaultMessage: 'Select',
                      }
                    )}
                    singleSelection
                    options={paramsForRules[param] || []}
                    selectedOptions={
                      filters[param]
                        ? [
                            {
                              label: findLabel(param, filters[param]),
                              value: String(filters[param]),
                            },
                          ]
                        : undefined
                    }
                    onChange={(value) => handleChange(param, value[0]?.value)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
