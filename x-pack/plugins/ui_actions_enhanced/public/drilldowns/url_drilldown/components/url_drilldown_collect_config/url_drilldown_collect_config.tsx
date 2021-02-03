/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useState } from 'react';
import {
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
  EuiText,
  EuiTextArea,
  EuiSelectableOption,
  EuiSwitch,
  EuiAccordion,
  EuiSpacer,
  EuiPanel,
  EuiTextColor,
} from '@elastic/eui';
import { UrlDrilldownConfig } from '../../types';
import './index.scss';
import {
  txtAddVariableButtonTitle,
  txtUrlTemplateSyntaxHelpLinkText,
  txtUrlTemplateVariablesHelpLinkText,
  txtUrlTemplateVariablesFilterPlaceholderText,
  txtUrlTemplateLabel,
  txtUrlTemplateOpenInNewTab,
  txtUrlTemplatePlaceholder,
  txtUrlTemplateAdditionalOptions,
  txtUrlTemplateEncodeUrl,
  txtUrlTemplateEncodeDescription,
} from './i18n';

export interface UrlDrilldownCollectConfig {
  config: UrlDrilldownConfig;
  variables: string[];
  onConfig: (newConfig: UrlDrilldownConfig) => void;
  syntaxHelpDocsLink?: string;
  variablesHelpDocsLink?: string;
}

export const UrlDrilldownCollectConfig: React.FC<UrlDrilldownCollectConfig> = ({
  config,
  variables,
  onConfig,
  syntaxHelpDocsLink,
  variablesHelpDocsLink,
}) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [showUrlError, setShowUrlError] = React.useState(false);
  const urlTemplate = config.url.template ?? '';

  function updateUrlTemplate(newUrlTemplate: string) {
    if (config.url.template !== newUrlTemplate) {
      setShowUrlError(true);
      onConfig({
        ...config,
        url: {
          ...config.url,
          template: newUrlTemplate,
        },
      });
    }
  }
  const isEmpty = !urlTemplate;
  const isInvalid = showUrlError && isEmpty;
  const variablesDropdown = (
    <AddVariableButton
      variables={variables}
      variablesHelpLink={variablesHelpDocsLink}
      onSelect={(variable: string) => {
        if (textAreaRef.current) {
          updateUrlTemplate(
            urlTemplate.substr(0, textAreaRef.current!.selectionStart) +
              `{{${variable}}}` +
              urlTemplate.substr(textAreaRef.current!.selectionEnd)
          );
        } else {
          updateUrlTemplate(urlTemplate + `{{${variable}}}`);
        }
      }}
    />
  );

  return (
    <>
      <EuiFormRow
        fullWidth
        isInvalid={isInvalid}
        className={'uaeUrlDrilldownCollectConfig__urlTemplateFormRow'}
        label={txtUrlTemplateLabel}
        helpText={
          syntaxHelpDocsLink && (
            <EuiLink external target={'_blank'} href={syntaxHelpDocsLink}>
              {txtUrlTemplateSyntaxHelpLinkText}
            </EuiLink>
          )
        }
        labelAppend={variablesDropdown}
      >
        <EuiTextArea
          fullWidth
          isInvalid={isInvalid}
          name="url"
          data-test-subj="urlInput"
          value={urlTemplate}
          placeholder={txtUrlTemplatePlaceholder}
          onChange={(event) => updateUrlTemplate(event.target.value)}
          onBlur={() => setShowUrlError(true)}
          rows={3}
          inputRef={textAreaRef}
        />
      </EuiFormRow>
      <EuiSpacer size={'l'} />
      <EuiAccordion
        id="accordion_url_drilldown_additional_options"
        buttonContent={txtUrlTemplateAdditionalOptions}
        data-test-subj="urlDrilldownAdditionalOptions"
      >
        <EuiSpacer size={'s'} />
        <EuiPanel color="subdued" borderRadius="none" hasShadow={false} style={{ border: 'none' }}>
          <EuiFormRow hasChildLabel={false}>
            <EuiSwitch
              id="openInNewTab"
              name="openInNewTab"
              label={txtUrlTemplateOpenInNewTab}
              checked={config.openInNewTab}
              onChange={() => onConfig({ ...config, openInNewTab: !config.openInNewTab })}
              data-test-subj="urlDrilldownOpenInNewTab"
            />
          </EuiFormRow>
          <EuiFormRow hasChildLabel={false} fullWidth>
            <EuiSwitch
              id="encodeUrl"
              name="encodeUrl"
              label={
                <>
                  {txtUrlTemplateEncodeUrl}
                  <EuiSpacer size={'s'} />
                  <EuiTextColor color="subdued">{txtUrlTemplateEncodeDescription}</EuiTextColor>
                </>
              }
              checked={config.encodeUrl ?? true}
              onChange={() => onConfig({ ...config, encodeUrl: !(config.encodeUrl ?? true) })}
            />
          </EuiFormRow>
        </EuiPanel>
      </EuiAccordion>
    </>
  );
};

function AddVariableButton({
  variables,
  onSelect,
  variablesHelpLink,
}: {
  variables: string[];
  onSelect: (variable: string) => void;
  variablesHelpLink?: string;
}) {
  const [isVariablesPopoverOpen, setIsVariablesPopoverOpen] = useState<boolean>(false);
  const closePopover = () => setIsVariablesPopoverOpen(false);

  const options: EuiSelectableOption[] = variables.map((variable: string) => ({
    key: variable,
    label: variable,
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
}
