/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback, FormEvent } from 'react';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
} from '@elastic/eui';
import { useStyles } from './styles';
import type { ControlGeneralViewSelectorDeps, ControlFormErrorMap } from '../../types';
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
  const [errorMap, setErrorMap] = useState<ControlFormErrorMap>({});
  const styles = useStyles();
  const onOpenPopover = useCallback(() => {
    setPopoverOpen(true);
  }, []);

  const closePopover = useCallback(() => {
    setPopoverOpen(false);
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
      if (VALID_SELECTOR_NAME_REGEX.test(value)) {
        errors.push(i18n.errorInvalidName);
      }

      if (errors.length) {
        errorMap.name = errors;
      } else {
        delete errorMap.name;
      }

      setErrorMap(errorMap);
      selector.name = value;

      onChange(selector);
    },
    [errorMap, onChange, selector, selectors]
  );

  return (
    <EuiAccordion
      id={selector.name}
      buttonContent={selector.name}
      extraAction={
        <EuiPopover
          id={selector.name}
          button={<EuiButtonIcon iconType="boxesHorizontal" onClick={onOpenPopover} />}
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
      <EuiForm component="form">
        <EuiFormRow label={i18n.name}>
          <EuiFieldText name="name" value={selector.name} onChange={onNameChange} />
        </EuiFormRow>
      </EuiForm>
    </EuiAccordion>
  );
};
