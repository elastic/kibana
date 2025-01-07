/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState, useCallback, ChangeEvent, useEffect } from 'react';
import {
  EuiCallOut,
  EuiIcon,
  EuiToolTip,
  EuiText,
  EuiBadge,
  EuiAccordion,
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
  euiPaletteColorBlindBehindText,
  useEuiTheme,
} from '@elastic/eui';
import { useStyles } from './styles';
import { useStyles as useSelectorStyles } from '../control_general_view_selector/styles';
import { ControlGeneralViewResponseDeps, ControlFormErrorMap } from '../../types';
import { Response, ResponseAction } from '../../../common';
import * as i18n from '../control_general_view/translations';
import {
  getSelectorTypeIcon,
  validateBlockRestrictions,
  selectorsIncludeConditionsForFIMOperationsUsingSlashStarStar,
} from '../../common/utils';

// max number of names to show in title (in collapsed state)
// selectorA, selectorB, selectorC, selectorD [+5]
const titleThreshold = 4;
const titleThresholdCollapsed = 2;

const ACTION_ID_REGEX = /response_\d+_(.*)/;

export const ControlGeneralViewResponse = ({
  response,
  selectors,
  responses,
  index,
  onRemove,
  onDuplicate,
  onChange,
}: ControlGeneralViewResponseDeps) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const styles = useStyles();
  const selectorStyles = useSelectorStyles();
  const visColorsBehindText = euiPaletteColorBlindBehindText();
  const [accordionState, setAccordionState] = useState<'open' | 'closed'>(
    responses.length - 1 === index ? 'open' : 'closed'
  );

  const logSelected = response.actions?.includes('log');
  const alertSelected = response.actions?.includes('alert');
  const blockSelected = response.actions?.includes('block');

  const warnFIMUsingSlashStarStar = useMemo(
    () =>
      blockSelected &&
      selectorsIncludeConditionsForFIMOperationsUsingSlashStarStar(selectors, response.match),
    [blockSelected, response.match, selectors]
  );

  const errors = useMemo(() => {
    const errs: ControlFormErrorMap = {};

    if (response.match.length === 0) {
      errs.match = [i18n.errorValueRequired];
    }

    if (response.actions?.length === 0) {
      errs.actions = [i18n.errorActionRequired];
    }

    if (blockSelected) {
      const blockErrors = validateBlockRestrictions(selectors, [response]);
      if (blockErrors.length > 0) {
        errs.response = blockErrors;
      }
    }

    return errs;
  }, [response, selectors, blockSelected]);

  const errorList = useMemo(() => Object.values(errors), [errors]);

  const onResponseChange = useCallback(
    (resp: Response, i: number) => {
      if (errorList.length) {
        resp.hasErrors = true;
      }

      onChange(resp, i);
    },
    [errorList.length, onChange]
  );

  useEffect(() => {
    const hasErrors = errorList.length > 0;
    const changed = (hasErrors && !response.hasErrors) || (!hasErrors && response.hasErrors);
    if (changed) {
      response.hasErrors = hasErrors;
      onChange(response, index);
    }
  }, [errorList.length, index, onChange, response]);

  const onTogglePopover = useCallback(() => {
    setPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback(() => {
    setPopoverOpen(false);
  }, []);

  const onRemoveClicked = useCallback(() => {
    onRemove(index);
    closePopover();
  }, [closePopover, index, onRemove]);

  const onDuplicateClicked = useCallback(() => {
    onDuplicate(response);
    closePopover();
  }, [closePopover, onDuplicate, response]);

  const onChangeMatches = useCallback(
    (options: any) => {
      response.match = options.map((option: EuiComboBoxOptionOption) => option.value);

      onResponseChange(response, index);
    },
    [index, onResponseChange, response]
  );

  const onChangeExcludes = useCallback(
    (options: any) => {
      response.exclude = options.map((option: EuiComboBoxOptionOption) => option.value);

      if (response.exclude?.length === 0) {
        delete response.exclude;
      }

      onResponseChange(response, index);
    },
    [index, onResponseChange, response]
  );

  const selectorOptions = useMemo(() => {
    return selectors
      .filter(
        (selector) =>
          !(
            selector.type !== response.type ||
            response.match.includes(selector.name) ||
            response.exclude?.includes(selector.name)
          )
      )
      .map((selector) => ({ label: selector.name, value: selector.name }));
  }, [response.exclude, response.match, response.type, selectors]);

  const selectedMatches = useMemo(
    () =>
      response.match.map((selector) => ({
        label: selector as unknown as string,
        value: selector as unknown as string,
        color: visColorsBehindText[0],
      })),
    [response.match, visColorsBehindText]
  );

  const selectedExcludes = useMemo(
    () =>
      response.exclude &&
      response.exclude.map((selector) => ({
        label: selector as unknown as string,
        value: selector as unknown as string,
        color: visColorsBehindText[5],
      })),
    [response.exclude, visColorsBehindText]
  );

  const onShowExclude = useCallback(() => {
    const updatedResponse = { ...response };
    updatedResponse.exclude = [];
    onResponseChange(updatedResponse, index);
  }, [index, onResponseChange, response]);

  const onToggleAction = useCallback(
    (e: ChangeEvent) => {
      const action = e.currentTarget?.id?.match(ACTION_ID_REGEX)?.[1] as ResponseAction;
      const updatedResponse = JSON.parse(JSON.stringify(response));
      const actionIndex = updatedResponse.actions.indexOf(action);

      if (actionIndex === -1) {
        updatedResponse.actions.push(action);
      } else {
        // if alert action gets disabled, disable block action
        if (action === 'alert') {
          const blockIndex = updatedResponse.actions.indexOf('block');

          if (blockIndex !== -1) {
            updatedResponse.actions.splice(blockIndex, 1);
          }
        }

        updatedResponse.actions.splice(actionIndex, 1);
      }

      onResponseChange(updatedResponse, index);
    },
    [index, onResponseChange, response]
  );

  const onToggleAccordion = useCallback((isOpen: boolean) => {
    setAccordionState(isOpen ? 'open' : 'closed');
  }, []);

  const { title, plusCount, remainingNames } = useMemo(() => {
    if (accordionState === 'open') {
      return {
        title: response.match.slice(0, titleThreshold).join(', '),
        plusCount: response.match.length - titleThreshold,
        remainingNames: response.match.slice(titleThreshold).join(','),
      };
    }

    return {
      title: response.match.slice(0, titleThresholdCollapsed).join(', '),
      plusCount: response.match.length - titleThresholdCollapsed,
      remainingNames: response.match.slice(titleThresholdCollapsed).join(','),
    };
  }, [accordionState, response.match]);

  return (
    <EuiAccordion
      id={'response_' + index}
      forceState={accordionState}
      onToggle={onToggleAccordion}
      data-test-subj={`cloud-defend-${response.type}-response`}
      paddingSize="m"
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiToolTip content={i18n.getResponseIconTooltip(response.type)}>
              <EuiIcon color="primary" type={getSelectorTypeIcon(response.type)} />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" css={styles.accordionHeader}>
              <b>{title}</b>
              {plusCount > 0 && <EuiBadge title={remainingNames}>+{plusCount}</EuiBadge>}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      css={styles.accordion}
      initialIsOpen={index === 0}
      extraAction={
        <EuiFlexGroup alignItems="center" gutterSize="none" wrap={false}>
          {accordionState === 'closed' && (
            <EuiText color="subdued" css={selectorStyles.conditionsBadge} size="xs">
              {response?.exclude?.length && (
                <>
                  <b>{i18n.exclude}: </b>
                  <EuiBadge title={response.exclude.join(',')} color="hollow">
                    {response.exclude.length}
                  </EuiBadge>
                  <div css={selectorStyles.verticalDivider} />
                </>
              )}
              <b>{i18n.actions}: </b>
              {response.actions?.map((action, i) => (
                <span key={action}>
                  <b css={{ color: action === 'block' ? colors.danger : colors.ink }}>
                    {action[0].toUpperCase() + action.slice(1)}
                  </b>
                  {i !== (response.actions?.length || 0) - 1 && ', '}
                </span>
              ))}
              <div css={selectorStyles.verticalDivider} />
            </EuiText>
          )}
          <EuiFlexItem>
            <EuiPopover
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
      }
    >
      <EuiForm component="form" fullWidth error={errorList} isInvalid={errorList.length > 0}>
        {warnFIMUsingSlashStarStar && (
          <EuiFormRow fullWidth>
            <EuiCallOut color="warning" title={i18n.warningFIMUsingSlashStarStarTitle}>
              <p>{i18n.warningFIMUsingSlashStarStarText}</p>
            </EuiCallOut>
          </EuiFormRow>
        )}
        <EuiFormRow label={i18n.matchSelectors} fullWidth isInvalid={!!errors.match}>
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
        <EuiFormRow label={i18n.actions} fullWidth isInvalid={!!errors.actions}>
          <EuiFlexGroup direction="row" gutterSize="l">
            <EuiFlexItem grow={false}>
              <EuiCheckbox
                id={`response_${index}_log`}
                data-test-subj="cloud-defend-chklogaction"
                label={i18n.actionLog}
                checked={logSelected}
                onChange={onToggleAction}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiCheckbox
                id={`response_${index}_alert`}
                data-test-subj="cloud-defend-chkalertaction"
                label={i18n.actionAlert}
                checked={alertSelected}
                onChange={onToggleAction}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={i18n.actionBlockHelp}>
                <EuiCheckbox
                  id={`response_${index}_block`}
                  data-test-subj="cloud-defend-chkblockaction"
                  label={i18n.actionBlock}
                  checked={blockSelected}
                  onChange={onToggleAction}
                  disabled={!alertSelected}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiForm>
    </EuiAccordion>
  );
};
