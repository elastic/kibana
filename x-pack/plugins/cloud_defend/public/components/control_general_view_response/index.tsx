/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiForm,
  EuiFormRow,
  EuiComboBox,
  EuiCheckbox,
  EuiComboBoxOptionOption,
  EuiSpacer,
} from '@elastic/eui';
import { useStyles } from './styles';
import { ControlGeneralViewResponseDeps, ControlResponseAction } from '../../types';
import * as i18n from '../control_general_view/translations';

export const ControlGeneralViewResponse = ({
  response,
  selectors,
  responses,
  index,
  onRemove,
  onDuplicate,
  onChange,
}: ControlGeneralViewResponseDeps) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const styles = useStyles();

  const onTogglePopover = useCallback(() => {
    setPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen]);

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

      if (response.exclude?.length === 0) {
        delete response.exclude;
      }

      onChange(response);
    },
    [onChange, response]
  );

  const selectorOptions = useMemo(() => {
    return selectors
      .filter(
        (selector) =>
          !(response.match.includes(selector.name) || response.exclude?.includes(selector.name))
      )
      .map((selector) => ({ label: selector.name, value: selector.name }));
  }, [response.exclude, response.match, selectors]);

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

  const alertSelected = response.actions.includes(ControlResponseAction.alert);
  const blockSelected = response.actions.includes(ControlResponseAction.block);

  const onToggleAlert = useCallback(() => {
    if (alertSelected) {
      delete response.actions[response.actions.indexOf(ControlResponseAction.alert)];
    } else {
      response.actions.push(ControlResponseAction.alert);
    }
    onChange(response);
  }, [alertSelected, onChange, response]);

  const onToggleBlock = useCallback(() => {
    if (blockSelected) {
      delete response.actions[response.actions.indexOf(ControlResponseAction.block)];
    } else {
      response.actions.push(ControlResponseAction.block);

      // alert is required if block enabled
      if (!alertSelected) {
        onToggleAlert();
      }
    }
    onChange(response);
  }, [alertSelected, blockSelected, onChange, onToggleAlert, response]);

  return (
    <EuiFlexGroup data-test-subj="cloud-defend-response">
      <EuiFlexItem>
        <EuiForm component="form" fullWidth>
          <EuiFormRow label={i18n.matchSelectors} fullWidth>
            <EuiComboBox
              aria-label={i18n.matchSelectors}
              fullWidth
              selectedOptions={selectedMatches}
              options={selectorOptions}
              isClearable={true}
              onChange={onChangeMatches}
              data-test-subj="cloud-defend-responsematch"
            />
          </EuiFormRow>
          {response.exclude && (
            <EuiFormRow label={i18n.excludeSelectors} fullWidth>
              <EuiComboBox
                aria-label={i18n.excludeSelectors}
                fullWidth
                selectedOptions={selectedExcludes}
                options={selectorOptions}
                onChange={onChangeExcludes}
                isClearable={true}
                data-test-subj="cloud-defend-responseexclude"
              />
            </EuiFormRow>
          )}
          <EuiSpacer size="s" />
          {!response.exclude && (
            <EuiButtonEmpty
              iconType="plusInCircle"
              onClick={onShowExclude}
              size="xs"
              data-test-subj="cloud-defend-btnshowexclude"
            >
              {i18n.excludeSelectors}
            </EuiButtonEmpty>
          )}
          <EuiSpacer size="m" />
          <EuiFormRow label={i18n.actions} fullWidth>
            <EuiFlexGroup direction="row">
              <EuiFlexItem grow={false}>
                <EuiSpacer size="s" />
                <EuiCheckbox
                  id={'alert' + index}
                  data-test-subj="cloud-defend-chkalertaction"
                  disabled={blockSelected}
                  label={i18n.actionAlert}
                  checked={alertSelected}
                  onChange={onToggleAlert}
                />
              </EuiFlexItem>
              <EuiSpacer size="m" />
              <EuiFlexItem>
                <EuiSpacer size="s" />
                <EuiCheckbox
                  id={'block' + index}
                  data-test-subj="cloud-defend-chkblockaction"
                  label={i18n.actionBlock}
                  checked={blockSelected}
                  onChange={onToggleBlock}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiForm>

        <EuiPopover
          css={styles.options}
          button={
            <EuiButtonIcon
              iconType="boxesHorizontal"
              onClick={onTogglePopover}
              aria-label="Response options"
              data-test-subj="cloud-defend-btnresponsepopover"
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
                data-test-subj="cloud-defend-btnduplicateresponse"
              >
                {i18n.duplicate}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key="remove"
                icon="trash"
                disabled={responses.length < 2}
                onClick={onRemoveClicked}
                data-test-subj="cloud-defend-btndeleteresponse"
              >
                {i18n.remove}
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
