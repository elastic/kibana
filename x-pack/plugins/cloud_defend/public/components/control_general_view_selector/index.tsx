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
} from '@elastic/eui';
import { useStyles } from './styles';
import {
  ControlGeneralViewSelectorDeps,
  ControlFormErrorMap,
  ControlSelectorCondition,
} from '../../types';
import { getControlSelectorValueForProp, setControlSelectorValueForProp } from '../../common/utils';
import * as i18n from '../control_general_view/translations';
import { VALID_SELECTOR_NAME_REGEX } from '../../common/constants';

export const ControlGeneralViewSelector = ({
  selector,
  selectors,
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
    onRemove(selector);
    closePopover();
  }, [closePopover, onRemove, selector]);

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
      selector.name = value;
      selector.hasErrors = Object.keys(errorMap).length > 0;

      onChange(selector);
    },
    [errorMap, onChange, selector, selectors]
  );

  const onAddCondition = useCallback(
    (prop: string) => {
      setControlSelectorValueForProp(prop, [], selector);
    },
    [selector]
  );

  const onChangeCondition = useCallback(
    (key: string, values: string[]) => {
      setControlSelectorValueForProp(key, values, selector);
      onChange(selector);
    },
    [onChange, selector]
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

  return (
    <EuiAccordion
      id={selector.name}
      paddingSize="l"
      buttonContent={selector.name}
      extraAction={
        <EuiPopover
          id={selector.name}
          button={<EuiButtonIcon iconType="boxesHorizontal" onClick={onTogglePopover} />}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenuPanel
            size="s"
            items={[
              <EuiContextMenuItem key="duplicate" icon="duplicate" onClick={onDuplicateClicked}>
                {i18n.duplicate}
              </EuiContextMenuItem>,
              <EuiContextMenuItem key="remove" icon="remove" onClick={onRemoveClicked}>
                {i18n.remove}
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      }
    >
      <EuiForm component="form" error={errors} isInvalid={errors.length > 0}>
        <EuiFormRow label={i18n.name}>
          <EuiFieldText
            name="name"
            value={selector.name}
            onChange={onNameChange}
            isInvalid={errorMap.hasOwnProperty('name')}
          />
        </EuiFormRow>
        {Object.keys(selector).map((prop: string) => {
          if (['name', 'hasErrors'].indexOf(prop) === -1) {
            const selectedOptions =
              getControlSelectorValueForProp(prop, selector)?.map((option) => {
                return { label: option, value: option };
              }) || [];

            const label = i18n.getConditionLabel(prop);

            return (
              <EuiFormRow label={label}>
                <EuiComboBox
                  aria-label={label}
                  selectedOptions={selectedOptions}
                  options={selectedOptions}
                  onChange={(options) =>
                    onChangeCondition(prop, options.map((option) => option.value) as string[])
                  }
                  isClearable={true}
                  data-test-subj={'condition-' + prop}
                />
              </EuiFormRow>
            );
          }
        })}
      </EuiForm>

      <EuiPopover
        id="cloudDefendControlAddCondition"
        button={
          <EuiButtonEmpty onClick={onToggleAddCondition} iconType="plusInCircle">
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
                {prop}
              </EuiContextMenuItem>
            );
          })}
        />
      </EuiPopover>
    </EuiAccordion>
  );
};
