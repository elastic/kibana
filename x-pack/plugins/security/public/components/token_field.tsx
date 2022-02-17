/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import type { FunctionComponent, ReactElement } from 'react';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';

export interface TokenFieldProps extends Omit<EuiFieldTextProps, 'append'> {
  value: string;
}

export const TokenField: FunctionComponent<TokenFieldProps> = (props) => {
  return (
    <EuiFormControlLayout
      {...props}
      append={
        <EuiCopy textToCopy={props.value}>
          {(copyText) => (
            <EuiButtonIcon
              aria-label={i18n.translate('xpack.security.copyTokenField.copyButton', {
                defaultMessage: 'Copy to clipboard',
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
        aria-label={i18n.translate('xpack.security.copyTokenField.tokenLabel', {
          defaultMessage: 'Token',
        })}
        className="euiFieldText euiFieldText--inGroup"
        value={props.value}
        style={{ fontFamily: euiThemeVars.euiCodeFontFamily, fontSize: euiThemeVars.euiFontSizeXS }}
        onFocus={(event) => event.currentTarget.select()}
        readOnly
      />
    </EuiFormControlLayout>
  );
};

export interface SelectableTokenFieldOption {
  key: string;
  value: string;
  icon?: string;
  label: string;
  description?: string;
}

export interface SelectableTokenFieldProps extends Omit<EuiFieldTextProps, 'value' | 'prepend'> {
  options: SelectableTokenFieldOption[];
}

export const SelectableTokenField: FunctionComponent<SelectableTokenFieldProps> = (props) => {
  const { options, ...rest } = props;
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [selectedOption, setSelectedOption] = React.useState<SelectableTokenFieldOption>(
    options[0]
  );
  const selectedIndex = options.findIndex((c) => c.key === selectedOption.key);
  const closePopover = () => setIsPopoverOpen(false);

  return (
    <TokenField
      {...rest}
      prepend={
        <EuiPopover
          button={
            <EuiButtonEmpty
              size="xs"
              iconType="arrowDown"
              iconSide="right"
              color="success"
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
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
            items={options.reduce<ReactElement[]>((items, option, i) => {
              items.push(
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
                items.push(<EuiHorizontalRule key={`${option.key}-seperator`} margin="none" />);
              }
              return items;
            }, [])}
          />
        </EuiPopover>
      }
      value={selectedOption.value}
    />
  );
};
