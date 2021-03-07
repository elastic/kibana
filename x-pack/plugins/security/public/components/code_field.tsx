/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, ReactElement } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiFieldTextProps } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiCopy,
  EuiFormControlLayout,
  EuiHorizontalRule,
  EuiPopover,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useTheme } from './use_theme';

export interface CodeFieldProps extends Omit<EuiFieldTextProps, 'append'> {
  value: string;
}

export const CodeField: FunctionComponent<CodeFieldProps> = (props) => {
  const theme = useTheme();

  return (
    <EuiFormControlLayout
      {...props}
      append={
        <EuiCopy textToCopy={props.value}>
          {(copyText) => (
            <EuiButtonIcon
              aria-label={i18n.translate('xpack.security.copyCodeField.copyButton', {
                defaultMessage: 'Copy code',
              })}
              iconType="copyClipboard"
              color="success"
              style={{ backgroundColor: 'transparent' }}
              onClick={copyText}
            />
          )}
        </EuiCopy>
      }
      style={{ backgroundColor: 'transparent' }}
      readOnly
    >
      <input
        type="text"
        className="euiFieldText euiFieldText--inGroup"
        value={props.value}
        style={{ fontFamily: theme.euiCodeFontFamily, fontSize: theme.euiFontSizeXS }}
        onFocus={(event) => event.currentTarget.select()}
        readOnly
      />
    </EuiFormControlLayout>
  );
};

export interface SelectableCodeFieldOption {
  key: string;
  value: string;
  icon?: string;
  label: string;
  description?: string;
}

export interface SelectableCodeFieldProps extends Omit<EuiFieldTextProps, 'value' | 'prepend'> {
  options: Array<SelectableCodeFieldOption>;
}

export const SelectableCodeField: FunctionComponent<SelectableCodeFieldProps> = (props) => {
  const { options, ...rest } = props;
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [selectedOption, setSelectedOption] = React.useState<SelectableCodeFieldOption>(options[0]);
  const selectedIndex = options.findIndex((c) => c.key === selectedOption.key);
  const closePopover = () => setIsPopoverOpen(false);

  return (
    <CodeField
      {...rest}
      prepend={
        <EuiPopover
          button={
            <EuiButtonEmpty
              size="xs"
              iconType="arrowDown"
              iconSide="right"
              color="success"
              onClick={() => {
                console.log('toggle');
                setIsPopoverOpen(!isPopoverOpen);
              }}
            >
              {selectedOption.label}
            </EuiButtonEmpty>
          }
          isOpen={isPopoverOpen}
          panelPaddingSize="none"
          closePopover={closePopover}
        >
          <EuiContextMenuPanel
            initialFocusedItemIndex={selectedIndex * 2}
            items={options.reduce<Array<ReactElement>>((accumulator, option, i) => {
              accumulator.push(
                <EuiContextMenuItem
                  key={option.key}
                  icon={option.icon}
                  layoutAlign="top"
                  onClick={() => {
                    closePopover();
                    setSelectedOption(option);
                  }}
                >
                  <strong>{option.label}</strong>
                  <EuiSpacer size="xs" />
                  <EuiText size="s" color="subdued">
                    <p>{option.description}</p>
                  </EuiText>
                </EuiContextMenuItem>
              );
              if (i < options.length - 1) {
                accumulator.push(
                  <EuiHorizontalRule key={`${option.key}-seperator`} margin="none" />
                );
              }
              return accumulator;
            }, [])}
          />
        </EuiPopover>
      }
      value={selectedOption.value}
    />
  );
};
