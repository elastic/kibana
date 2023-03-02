/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPopover,
  EuiButtonIcon,
  EuiText,
  EuiButtonEmpty,
  EuiSelectable,
  EuiSpacer,
  EuiHighlight,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopoverFooter,
  EuiToolTip,
} from '@elastic/eui';
import './add_message_variables.scss';
import { ActionVariable } from '@kbn/alerting-plugin/common';
import { TruncatedText } from '../../common/truncated_text';

interface Props {
  buttonTitle?: string;
  messageVariables?: ActionVariable[];
  paramsProperty: string;
  onSelectEventHandler: (variable: ActionVariable) => void;
  showButtonTitle?: boolean;
}

const LOADING_VARIABLES = i18n.translate(
  'xpack.triggersActionsUI.components.addMessageVariables.loadingMessage',
  {
    defaultMessage: 'Loading variables',
  }
);

const NO_VARIABLES_FOUND = i18n.translate(
  'xpack.triggersActionsUI.components.addMessageVariables.noVariablesFound',
  {
    defaultMessage: 'No variables found',
  }
);

const NO_VARIABLES_AVAILABLE = i18n.translate(
  'xpack.triggersActionsUI.components.addMessageVariables.noVariablesAvailable',
  {
    defaultMessage: 'No variables available',
  }
);

export const AddMessageVariables: React.FunctionComponent<Props> = ({
  buttonTitle,
  messageVariables,
  paramsProperty,
  onSelectEventHandler,
  showButtonTitle = false,
}) => {
  const [isShowAllPressed, setIsShowAllPressed] = useState(false);
  const [isVariablesPopoverOpen, setIsVariablesPopoverOpen] = useState<boolean>(false);

  const { euiTheme } = useEuiTheme();

  const messageVariablesObject: Record<string, ActionVariable> | undefined =
    messageVariables?.reduce((acc, variable) => {
      return {
        ...acc,
        [variable.name]: variable,
      };
    }, {});

  const shownOptions = useMemo(() => {
    return isShowAllPressed
      ? messageVariables?.map((variable) => ({
          label: variable.name,
          ...(variable.deprecated ? { disabled: true } : {}),
          data: {
            secondaryContent: variable.description,
          },
          'data-test-subj': `${variable.name}-selectableOption`,
        }))
      : messageVariables
          ?.filter((variable) => !variable.deprecated)
          .map((variable) => ({
            label: variable.name,
            data: {
              secondaryContent: variable.description,
            },
            'data-test-subj': `${variable.name}-selectableOption`,
          }));
  }, [isShowAllPressed, messageVariables]);

  const addVariableButtonTitle = buttonTitle
    ? buttonTitle
    : i18n.translate(
        'xpack.triggersActionsUI.components.addMessageVariables.addRuleVariableTitle',
        {
          defaultMessage: 'Add variable',
        }
      );

  const Button = useMemo(
    () =>
      showButtonTitle ? (
        <EuiButtonEmpty
          id={`${paramsProperty}AddVariableButton`}
          data-test-subj={`${paramsProperty}AddVariableButton-Title`}
          size="xs"
          onClick={() => setIsVariablesPopoverOpen(true)}
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.components.addMessageVariables.addVariablePopoverButton',
            {
              defaultMessage: 'Add variable',
            }
          )}
        >
          {addVariableButtonTitle}
        </EuiButtonEmpty>
      ) : (
        <EuiButtonIcon
          id={`${paramsProperty}AddVariableButton`}
          data-test-subj={`${paramsProperty}AddVariableButton`}
          title={addVariableButtonTitle}
          onClick={() => setIsVariablesPopoverOpen(true)}
          iconType="indexOpen"
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.components.addMessageVariables.addVariablePopoverButton',
            {
              defaultMessage: 'Add variable',
            }
          )}
        />
      ),
    [addVariableButtonTitle, paramsProperty, showButtonTitle]
  );
  if ((messageVariables?.length ?? 0) === 0) {
    return <></>;
  }

  const renderOption = (option: any, searchValue: string) => {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText
            size="s"
            style={{
              fontWeight: euiTheme.font.weight.bold,
            }}
          >
            <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <EuiToolTip
              display="block"
              position="top"
              content={option.secondaryContent || ''}
              data-test-subj={`${option.label}-tooltip`}
            >
              <TruncatedText text={option.secondaryContent || ''} />
            </EuiToolTip>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <EuiPopover
      button={Button}
      isOpen={isVariablesPopoverOpen}
      closePopover={() => setIsVariablesPopoverOpen(false)}
      panelPaddingSize="s"
      anchorPosition="upRight"
      panelStyle={{ minWidth: 350 }}
    >
      <EuiSelectable
        searchable
        height={300}
        data-test-subj={'messageVariablesSelectableList'}
        isLoading={false}
        options={shownOptions}
        listProps={{
          rowHeight: 70,
          showIcons: false,
          paddingSize: 'none',
          textWrap: 'wrap',
        }}
        loadingMessage={LOADING_VARIABLES}
        noMatchesMessage={NO_VARIABLES_FOUND}
        emptyMessage={NO_VARIABLES_AVAILABLE}
        renderOption={renderOption}
        onChange={(variables) => {
          variables.map((variable) => {
            if (variable.checked === 'on' && messageVariablesObject) {
              onSelectEventHandler(messageVariablesObject[variable.label]);
            }
          });
          setIsVariablesPopoverOpen(false);
        }}
        singleSelection
      >
        {(list, search) => (
          <>
            {search}
            <EuiSpacer size="xs" />
            {list}
            <EuiPopoverFooter style={{ paddingTop: 0, paddingBottom: 0 }}>
              <EuiFlexGroup
                gutterSize="s"
                alignItems="center"
                justifyContent="spaceBetween"
                responsive={false}
                wrap={true}
              >
                <EuiFlexItem grow={false}>
                  <EuiText color="grey" size="xs">
                    {isShowAllPressed
                      ? 'Depricated variables are shown'
                      : 'Depricated variables were hidden'}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj={'showDepricatedVariablesButton'}
                    size="xs"
                    onClick={() =>
                      isShowAllPressed ? setIsShowAllPressed(false) : setIsShowAllPressed(true)
                    }
                  >
                    {isShowAllPressed ? 'Hide' : 'Show all'}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPopoverFooter>
          </>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
