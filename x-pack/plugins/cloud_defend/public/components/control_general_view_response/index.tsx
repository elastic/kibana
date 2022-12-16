/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiForm,
  EuiFormRow,
  EuiComboBox,
  EuiCheckboxGroup,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { useStyles } from './styles';
import { ControlGeneralViewResponseDeps, ControlResponseAction } from '../../types';
import * as i18n from '../control_general_view/translations';

const ActionOptions = [
  { label: i18n.actionAlert, id: ControlResponseAction.alert as unknown as string },
  { label: i18n.actionBlock, id: ControlResponseAction.block as unknown as string },
];

export const ControlGeneralViewResponse = ({
  response,
  selectors,
  onRemove,
  onDuplicate,
  onChange,
}: ControlGeneralViewResponseDeps) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const styles = useStyles();
  const items = useMemo(() => {
    return [
      {
        key: 'duplicate',
        name: i18n.duplicate,
        icon: 'duplicate',
        onClick: () => {
          onDuplicate(response);
        },
      },
    ];
  }, [onDuplicate, response]);

  const closePopover = useCallback(() => {
    setPopoverOpen(false);
  }, []);

  const onRemoveClicked = useCallback(() => {
    onRemove(response);
    closePopover();
  }, [closePopover, onRemove, response]);

  const onDuplicateClicked = useCallback(() => {
    onDuplicate(response);
    closePopover();
  }, [closePopover, onDuplicate, response]);

  const onChangeMatches = useCallback(
    (options) => {
      response.match = options.map((option: EuiComboBoxOptionOption) => option.value);
      onChange(response);
    },
    [onChange, response]
  );

  const onChangeExcludes = useCallback(
    (options) => {
      response.exclude = options.map((option: EuiComboBoxOptionOption) => option.value);
      onChange(response);
    },
    [onChange, response]
  );

  const selectorOptions = useMemo(
    () => selectors.map((selector) => ({ label: selector.name, value: selector.name })),
    [selectors]
  );

  const selectedMatches = useMemo(
    () =>
      response.match.map((selector) => ({
        label: selector as unknown as string,
        value: selector as unknown as string,
      })),
    [response.match]
  );

  const selectedExcludes = useMemo(
    () =>
      response.exclude &&
      response.exclude.map((selector) => ({
        label: selector as unknown as string,
        value: selector as unknown as string,
      })),
    [response.exclude]
  );

  const onShowExclude = useCallback(() => {
    response.exclude = [];
    onChange(response);
  }, [onChange, response]);

  const selectedActionMap = useMemo(() => {
    const { actions } = response;
    return {
      alert: actions.includes(ControlResponseAction.alert),
      block: actions.includes(ControlResponseAction.block),
    };
  }, [response]);

  const onChangeActions = useCallback(
    (optionId: string) => {
      const action = optionId as unknown as ControlResponseAction;

      switch (action) {
        case ControlResponseAction.alert:
          if (!selectedActionMap.alert) {
            response.actions.push(ControlResponseAction.alert);
          } else {
            delete response.actions[response.actions.indexOf(action)];
          }
        case ControlResponseAction.block:
          if (!selectedActionMap.block) {
            response.actions.push(ControlResponseAction.block);
          } else {
            delete response.actions[response.actions.indexOf(action)];
          }
      }

      onChange(response);
    },
    [onChange, response, selectedActionMap.alert, selectedActionMap.block]
  );

  return (
    <EuiFlexGroup>
      <EuiPopover
        button={<EuiButtonIcon iconType="boxesHorizontal" />}
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
      <EuiForm component="form">
        <EuiFormRow label={i18n.matchSelectors}>
          <EuiComboBox
            aria-label={i18n.matchSelectors}
            fullWidth={true}
            selectedOptions={selectedMatches}
            options={selectorOptions}
            isClearable={true}
            onChange={onChangeMatches}
            data-test-subj="cloudDefend:controlResponseMatches"
          />
        </EuiFormRow>
        {response.exclude && (
          <EuiFormRow label={i18n.excludeSelectors}>
            <EuiComboBox
              aria-label={i18n.excludeSelectors}
              fullWidth={true}
              selectedOptions={selectedExcludes}
              options={selectorOptions}
              onChange={onChangeExcludes}
              isClearable={true}
              data-test-subj="cloudDefend:controlResponseExcludes"
            />
          </EuiFormRow>
        )}
        {!response.exclude && (
          <EuiButtonIcon iconType="plusInCircle" onClick={onShowExclude}>
            {i18n.excludeSelectors}
          </EuiButtonIcon>
        )}
        <EuiFormRow label={i18n.actions}>
          <EuiCheckboxGroup
            options={ActionOptions}
            idToSelectedMap={selectedActionMap}
            onChange={onChangeActions}
          />
        </EuiFormRow>
      </EuiForm>
    </EuiFlexGroup>
  );
};
