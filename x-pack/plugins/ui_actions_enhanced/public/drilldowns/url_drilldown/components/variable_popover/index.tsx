/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
  EuiText,
  EuiSelectableOption,
} from '@elastic/eui';
import { UrlTemplateEditorVariable } from '@kbn/kibana-react-plugin/public';
import {
  txtAddVariableButtonTitle,
  txtUrlTemplateVariablesHelpLinkText,
  txtUrlTemplateVariablesFilterPlaceholderText,
} from './i18n';

export interface Props {
  variables: UrlTemplateEditorVariable[];
  onSelect: (variable: string) => void;
  variablesHelpLink?: string;
}

export const VariablePopover: React.FC<Props> = ({ variables, onSelect, variablesHelpLink }) => {
  const [isVariablesPopoverOpen, setIsVariablesPopoverOpen] = useState<boolean>(false);
  const closePopover = () => setIsVariablesPopoverOpen(false);

  const options: EuiSelectableOption[] = variables.map(({ label }) => ({
    key: label,
    label,
  }));

  return (
    <EuiPopover
      ownFocus={true}
      button={
        <EuiText size="xs">
          <EuiLink onClick={() => setIsVariablesPopoverOpen(true)}>
            {txtAddVariableButtonTitle} <EuiIcon type="indexOpen" />
          </EuiLink>
        </EuiText>
      }
      isOpen={isVariablesPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiSelectable
        singleSelection={true}
        searchable
        searchProps={{
          placeholder: txtUrlTemplateVariablesFilterPlaceholderText,
          compressed: true,
        }}
        options={options}
        onChange={(newOptions) => {
          const selected = newOptions.find((o) => o.checked === 'on');
          if (!selected) return;
          onSelect(selected.key!);
          closePopover();
        }}
        listProps={{
          showIcons: false,
        }}
      >
        {(list, search) => (
          <div style={{ width: 320 }}>
            <EuiPopoverTitle>{search}</EuiPopoverTitle>
            {list}
            {variablesHelpLink && (
              <EuiPopoverFooter className={'eui-textRight'}>
                <EuiLink external href={variablesHelpLink} target="_blank">
                  {txtUrlTemplateVariablesHelpLinkText}
                </EuiLink>
              </EuiPopoverFooter>
            )}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
