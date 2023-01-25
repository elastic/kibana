/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo, useCallback, FormEvent } from 'react';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiButtonEmpty,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { useStyles } from './styles';
import {
  ControlGeneralViewSelectorDeps,
  ControlFormErrorMap,
  ControlSelectorCondition,
  ControlSelectorConditionUIOptionsMap,
  ControlSelector,
} from '../../types';
import * as i18n from '../control_general_view/translations';
import {
  VALID_SELECTOR_NAME_REGEX,
  MAX_SELECTOR_NAME_LENGTH,
  MAX_CONDITION_VALUE_LENGTH_BYTES,
  MAX_FILE_PATH_VALUE_LENGTH_BYTES,
} from '../../common/constants';

export const ControlGeneralViewSelector = ({
  selector,
  selectors,
  index,
  onRemove,
  onDuplicate,
  onChange,
}: ControlGeneralViewSelectorDeps) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const [isAddConditionOpen, setAddConditionOpen] = useState(false);
  const [errorMap, setErrorMap] = useState<ControlFormErrorMap>({});
  const styles = useStyles();
  const onTogglePopover = useCallback(() => {
    setPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback(() => {
    setPopoverOpen(false);
  }, []);

  const onToggleAddCondition = useCallback(() => {
    setAddConditionOpen(!isAddConditionOpen);
  }, [isAddConditionOpen]);

  const closeAddCondition = useCallback(() => {
    setAddConditionOpen(false);
  }, []);

  const onRemoveClicked = useCallback(() => {
    // we prevent the removal of the last selector to avoid an empty state
    if (selectors.length > 1) {
      onRemove(index);
    }

    closePopover();
  }, [closePopover, index, onRemove, selectors.length]);

  const onDuplicateClicked = useCallback(() => {
    onDuplicate(selector);
    closePopover();
  }, [closePopover, onDuplicate, selector]);

  const onNameChange = useCallback(
    (event: FormEvent<HTMLInputElement>) => {
      const errors: string[] = [];
      const value = event.currentTarget.value;

      // look for duplicate names (selector names should be unique)
      const found = selectors.find((sel) => sel.name === value);

      if (found) {
        errors.push(i18n.errorDuplicateName);
      }

      // ensure name is valid
      if (!VALID_SELECTOR_NAME_REGEX.test(value)) {
        errors.push(i18n.errorInvalidName);
      }

      if (errors.length) {
        errorMap.name = errors;
      } else {
        delete errorMap.name;
      }

      setErrorMap({ ...errorMap });

      const updatedSelector = { ...selector };

      updatedSelector.name = value;
      updatedSelector.hasErrors = Object.keys(errorMap).length > 0;

      onChange(updatedSelector, index);
    },
    [errorMap, index, onChange, selector, selectors]
  );

  const onChangeCondition = useCallback(
    (prop: string, values: string[]) => {
      const updatedSelector = { ...selector, [prop]: values };
      const errors = [];

      if (values.length === 0) {
        errors.push(i18n.errorValueRequired);
      }

      values.forEach((value) => {
        const bytes = new Blob([value]).size;

        if (prop === ControlSelectorCondition.targetFilePath) {
          if (bytes > MAX_FILE_PATH_VALUE_LENGTH_BYTES) {
            errors.push(i18n.errorValueLengthExceeded);
          }
        } else if (bytes > MAX_CONDITION_VALUE_LENGTH_BYTES) {
          errors.push(i18n.errorValueLengthExceeded);
        }
      });

      if (errors.length) {
        errorMap[prop] = errors;
      } else {
        delete errorMap[prop];
      }

      updatedSelector.hasErrors = Object.keys(errorMap).length > 0;
      setErrorMap({ ...errorMap });

      onChange(updatedSelector, index);
    },
    [errorMap, index, onChange, selector]
  );

  const onAddCondition = useCallback(
    (prop: string) => {
      onChangeCondition(prop, []);
      closeAddCondition();
    },
    [closeAddCondition, onChangeCondition]
  );

  const onRemoveCondition = useCallback(
    (prop: string) => {
      const updatedSelector = { ...selector };
      delete (updatedSelector as any)[prop];

      delete errorMap[prop];
      setErrorMap({ ...errorMap });
      updatedSelector.hasErrors = Object.keys(errorMap).length > 0;

      onChange(updatedSelector, index);
      closeAddCondition();
    },
    [closeAddCondition, errorMap, index, onChange, selector]
  );

  const onAddValueToCondition = useCallback(
    (prop: string, searchValue: string) => {
      const value = searchValue.trim();
      const values = selector[prop as keyof ControlSelector] as string[];

      if (values && values.indexOf(value) === -1) {
        onChangeCondition(prop, [...values, value]);
      }
    },
    [onChangeCondition, selector]
  );

  const errors = useMemo(() => {
    return Object.keys(errorMap).reduce<string[]>((prev, current) => {
      return prev.concat(errorMap[current]);
    }, []);
  }, [errorMap]);

  const remainingProps = useMemo(() => {
    return Object.keys(ControlSelectorCondition).filter(
      (condition) => !selector.hasOwnProperty(condition)
    );
  }, [selector]);

  const conditionsAdded = Object.keys(ControlSelectorCondition).length - remainingProps.length;

  return (
    <EuiAccordion
      id={selector.name}
      data-test-subj="cloud-defend-selector"
      paddingSize="m"
      buttonContent={selector.name}
      css={styles.accordion}
      initialIsOpen={index === 0}
      extraAction={
        <EuiPopover
          id={selector.name}
          button={
            <EuiButtonIcon
              iconType="boxesHorizontal"
              onClick={onTogglePopover}
              aria-label="Selector options"
              data-test-subj="cloud-defend-btnselectorpopover"
            />
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenuPanel
            size="s"
            items={[
              <EuiContextMenuItem
                key="duplicate"
                icon="copy"
                onClick={onDuplicateClicked}
                data-test-subj="cloud-defend-btnduplicateselector"
              >
                {i18n.duplicate}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key="remove"
                icon="trash"
                disabled={selectors.length < 2}
                onClick={onRemoveClicked}
                data-test-subj="cloud-defend-btndeleteselector"
              >
                {i18n.remove}
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      }
    >
      <EuiForm component="form" error={errors} isInvalid={errors.length > 0}>
        <EuiFormRow
          label={i18n.name}
          fullWidth={true}
          isInvalid={!!errorMap.hasOwnProperty('name')}
        >
          <EuiFieldText
            fullWidth={true}
            name="name"
            value={selector.name}
            onChange={onNameChange}
            isInvalid={errorMap.hasOwnProperty('name')}
            data-test-subj="cloud-defend-selectorcondition-name"
            maxLength={MAX_SELECTOR_NAME_LENGTH}
          />
        </EuiFormRow>
        {Object.keys(selector).map((prop: string) => {
          if (['name', 'hasErrors'].indexOf(prop) === -1) {
            const values = selector[prop as keyof ControlSelector] as string[];
            const selectedOptions =
              values?.map((option) => {
                return { label: option, value: option };
              }) || [];

            const label = i18n.getConditionLabel(prop);
            const restrictedValues = ControlSelectorConditionUIOptionsMap[prop]?.values;

            return (
              <EuiFormRow
                label={label}
                fullWidth={true}
                key={prop}
                isInvalid={!!errorMap.hasOwnProperty(prop)}
              >
                <EuiFlexGroup alignItems="center" gutterSize="m">
                  <EuiFlexItem>
                    <EuiComboBox
                      aria-label={label}
                      fullWidth={true}
                      onCreateOption={
                        !restrictedValues
                          ? (searchValue) => onAddValueToCondition(prop, searchValue)
                          : undefined
                      }
                      selectedOptions={selectedOptions}
                      options={
                        restrictedValues
                          ? restrictedValues.map((value: string) => ({ label: value, value }))
                          : selectedOptions
                      }
                      onChange={(options) =>
                        onChangeCondition(prop, options.map((option) => option.value) as string[])
                      }
                      isClearable
                      data-test-subj={'cloud-defend-selectorcondition-' + prop}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      disabled={conditionsAdded < 2}
                      iconType="cross"
                      onClick={() => onRemoveCondition(prop)}
                      aria-label="Remove condition"
                      data-test-subj={'cloud-defend-btnremovecondition-' + prop}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>
            );
          }
        })}
      </EuiForm>
      <EuiSpacer size="m" />
      <EuiPopover
        id="cloudDefendControlAddCondition"
        data-test-subj="cloud-defend-addconditionpopover"
        button={
          <EuiButtonEmpty
            onClick={onToggleAddCondition}
            iconType="plusInCircle"
            data-test-subj="cloud-defend-btnaddselectorcondition"
          >
            {i18n.addSelectorCondition}
          </EuiButtonEmpty>
        }
        isOpen={isAddConditionOpen}
        closePopover={closeAddCondition}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel
          size="s"
          items={remainingProps.map((prop) => {
            return (
              <EuiContextMenuItem key={prop} onClick={() => onAddCondition(prop)}>
                {i18n.getConditionLabel(prop)}
              </EuiContextMenuItem>
            );
          })}
        />
      </EuiPopover>
    </EuiAccordion>
  );
};
