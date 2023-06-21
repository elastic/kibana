/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo, useCallback, FormEvent } from 'react';
import {
  EuiBadge,
  EuiIcon,
  EuiToolTip,
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
  EuiText,
  EuiCheckbox,
} from '@elastic/eui';
import { useStyles } from './styles';
import {
  ControlGeneralViewSelectorDeps,
  ControlFormErrorMap,
  Selector,
  SelectorCondition,
  SelectorConditionsMap,
} from '../../types';
import {
  getSelectorConditions,
  camelToSentenceCase,
  getSelectorTypeIcon,
  conditionCombinationInvalid,
  getRestrictedValuesForCondition,
  validateStringValuesForCondition,
} from '../../common/utils';
import * as i18n from '../control_general_view/translations';
import { VALID_SELECTOR_NAME_REGEX, MAX_SELECTOR_NAME_LENGTH } from '../../common/constants';

interface ConditionProps {
  label: string;
  prop: SelectorCondition;
  onRemoveCondition(prop: SelectorCondition): void;
}

interface BooleanConditionProps extends ConditionProps {
  selector: Selector;
  onChangeBooleanCondition(prop: SelectorCondition, value: boolean): void;
}

interface StringArrayConditionProps extends ConditionProps {
  selector: Selector;
  errorMap: ControlFormErrorMap;
  onAddValueToCondition(prop: SelectorCondition, value: string): void;
  onChangeStringArrayCondition(prop: SelectorCondition, value: string[]): void;
}

const BooleanCondition = ({
  label,
  prop,
  selector,
  onChangeBooleanCondition,
  onRemoveCondition,
}: BooleanConditionProps) => {
  const value = selector[prop as keyof Selector] as boolean;
  const onChange = useCallback(
    (e) => {
      onChangeBooleanCondition(prop, e.target.checked);
    },
    [onChangeBooleanCondition, prop]
  );

  return (
    <EuiFormRow label={label} fullWidth={true} key={prop}>
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem>
          <EuiCheckbox id={prop} label={label} checked={value} onChange={onChange} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="cross"
            onClick={() => onRemoveCondition(prop)}
            aria-label="Remove condition"
            data-test-subj={'cloud-defend-btnremovecondition-' + prop}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

const FlagCondition = ({ label, prop, onRemoveCondition }: ConditionProps) => {
  return (
    <EuiFormRow label={label} fullWidth={true} key={prop}>
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem>
          <EuiText size="s">
            <p>
              <small>{i18n.getConditionHelpLabel(prop)}</small>
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="cross"
            onClick={() => onRemoveCondition(prop)}
            aria-label="Remove condition"
            data-test-subj={'cloud-defend-btnremovecondition-' + prop}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

const StringArrayCondition = ({
  label,
  prop,
  selector,
  errorMap,
  onRemoveCondition,
  onAddValueToCondition,
  onChangeStringArrayCondition,
}: StringArrayConditionProps) => {
  const values = selector[prop as keyof Selector] as string[];
  const selectedOptions =
    values?.map((option) => {
      return { label: option, value: option };
    }) || [];

  const restrictedValues = getRestrictedValuesForCondition(selector.type, prop);

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
              onChangeStringArrayCondition(prop, options.map((option) => option.value) as string[])
            }
            isClearable
            data-test-subj={'cloud-defend-selectorcondition-' + prop}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="cross"
            onClick={() => onRemoveCondition(prop)}
            aria-label="Remove condition"
            data-test-subj={'cloud-defend-btnremovecondition-' + prop}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

/** main component */
export const ControlGeneralViewSelector = ({
  selector,
  selectors,
  usedByResponse,
  index,
  onRemove,
  onDuplicate,
  onChange,
}: ControlGeneralViewSelectorDeps) => {
  // ensure most recently added is open by default
  const [accordionState, setAccordionState] = useState<'open' | 'closed'>(
    selectors.length - 1 === index ? 'open' : 'closed'
  );
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

  const availableConditions = useMemo(() => getSelectorConditions(selector.type), [selector]);

  const remainingConditions = useMemo(() => {
    return availableConditions.filter((condition) => !selector.hasOwnProperty(condition));
  }, [availableConditions, selector]);

  const conditionsAdded = useMemo(() => {
    return Object.keys(selector).filter(
      (key) => !['type', 'hasErrors', 'name'].includes(key)
    ) as SelectorCondition[];
  }, [selector]);

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
      updatedSelector.hasErrors = Object.keys(errorMap).length > 0 || conditionsAdded.length === 0;

      onChange(updatedSelector, index);
    },
    [errorMap, index, conditionsAdded, onChange, selector, selectors]
  );

  const onChangeStringArrayCondition = useCallback(
    (prop: SelectorCondition, values: string[]) => {
      const updatedSelector = { ...selector, [prop]: values };
      const errors = [];

      if (values.length === 0) {
        errors.push(i18n.errorValueRequired);
      }

      const stringValueErrors = validateStringValuesForCondition(prop, values);

      if (stringValueErrors.length > 0) {
        errors.push(...stringValueErrors);
      }

      if (errors.length) {
        errorMap[prop] = errors;
      } else {
        delete errorMap[prop];
      }

      updatedSelector.hasErrors = Object.keys(errorMap).length > 0 || conditionsAdded.length === 0;
      setErrorMap({ ...errorMap });

      onChange(updatedSelector, index);
    },
    [errorMap, index, conditionsAdded, onChange, selector]
  );

  const onChangeBooleanCondition = useCallback(
    (prop: string, value: boolean) => {
      const updatedSelector = { ...selector, [prop]: value };

      onChange(updatedSelector, index);
    },
    [index, onChange, selector]
  );

  const onAddCondition = useCallback(
    (prop: SelectorCondition) => {
      const valueType = SelectorConditionsMap[prop].type;

      if (valueType === 'flag' || valueType === 'boolean') {
        onChangeBooleanCondition(prop, true);
      } else {
        onChangeStringArrayCondition(prop, []);
      }
      closeAddCondition();
    },
    [closeAddCondition, onChangeBooleanCondition, onChangeStringArrayCondition]
  );

  const onRemoveCondition = useCallback(
    (prop: string) => {
      const updatedSelector = { ...selector };
      delete (updatedSelector as any)[prop];

      delete errorMap[prop];
      setErrorMap({ ...errorMap });
      updatedSelector.hasErrors = Object.keys(errorMap).length > 0 || conditionsAdded.length === 1;

      onChange(updatedSelector, index);
      closeAddCondition();
    },
    [closeAddCondition, conditionsAdded, errorMap, index, onChange, selector]
  );

  const onAddValueToCondition = useCallback(
    (prop: SelectorCondition, searchValue: string) => {
      const value = searchValue.trim();
      const values = selector[prop as keyof Selector] as string[];

      if (values && values.indexOf(value) === -1) {
        onChangeStringArrayCondition(prop, [...values, value]);
      }
    },
    [onChangeStringArrayCondition, selector]
  );

  const errors = useMemo(() => {
    const errs = Object.keys(errorMap).reduce<string[]>((prev, current) => {
      return prev.concat(errorMap[current]);
    }, []);

    if (conditionsAdded.length === 0) {
      errs.push(i18n.errorConditionRequired);
    }

    return errs;
  }, [errorMap, conditionsAdded]);

  const onToggleAccordion = useCallback((isOpen: boolean) => {
    setAccordionState(isOpen ? 'open' : 'closed');
  }, []);

  return (
    <EuiAccordion
      id={selector.name}
      forceState={accordionState}
      onToggle={onToggleAccordion}
      data-test-subj="cloud-defend-selector"
      paddingSize="m"
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EuiToolTip content={i18n.getSelectorIconTooltip(selector.type)}>
              <EuiIcon color="primary" type={getSelectorTypeIcon(selector.type)} />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <b>{selector.name}</b>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      css={styles.accordion}
      extraAction={
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <div>
            {accordionState === 'closed' && (
              <>
                <EuiText css={styles.conditionsBadge} size="xs">
                  <b>{i18n.conditions}</b>
                </EuiText>
                <EuiBadge
                  title={conditionsAdded.join(',')}
                  color="hollow"
                  data-test-subj="cloud-defend-conditions-count"
                >
                  {conditionsAdded.length}
                </EuiBadge>
              </>
            )}
            {!usedByResponse && (
              <EuiBadge title={i18n.unusedSelectorHelp} color="warning">
                {i18n.unusedSelector}
              </EuiBadge>
            )}
            <div css={styles.verticalDivider} />
          </div>
          <EuiFlexItem>
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
          </EuiFlexItem>
        </EuiFlexGroup>
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
        {conditionsAdded.map((prop) => {
          const label = camelToSentenceCase(prop);
          const valueType = SelectorConditionsMap[prop].type;

          if (valueType === 'flag') {
            return (
              <FlagCondition
                key={prop}
                label={label}
                prop={prop}
                onRemoveCondition={onRemoveCondition}
              />
            );
          } else if (valueType === 'boolean') {
            return (
              <BooleanCondition
                key={prop}
                label={label}
                selector={selector}
                prop={prop}
                onChangeBooleanCondition={onChangeBooleanCondition}
                onRemoveCondition={onRemoveCondition}
              />
            );
          } else {
            return (
              <StringArrayCondition
                key={prop}
                label={label}
                prop={prop}
                selector={selector}
                errorMap={errorMap}
                onAddValueToCondition={onAddValueToCondition}
                onChangeStringArrayCondition={onChangeStringArrayCondition}
                onRemoveCondition={onRemoveCondition}
              />
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
          items={remainingConditions.map((prop) => {
            const label = camelToSentenceCase(prop);
            const disabled = conditionCombinationInvalid(conditionsAdded, prop);

            return (
              <EuiContextMenuItem
                data-test-subj={`cloud-defend-addmenu-${prop}`}
                key={prop}
                onClick={() => onAddCondition(prop)}
                disabled={disabled}
              >
                {label}
              </EuiContextMenuItem>
            );
          })}
        />
      </EuiPopover>
    </EuiAccordion>
  );
};
