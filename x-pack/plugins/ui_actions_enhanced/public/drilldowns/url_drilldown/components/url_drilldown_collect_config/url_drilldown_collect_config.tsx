/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useState } from 'react';
import {
  EuiCheckbox,
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
} from '@elastic/eui';
import { UrlDrilldownConfig, UrlDrilldownScope } from '../../types';
import { compile } from '../../url_template';
import { validateUrlTemplate } from '../../url_validation';
import { buildScopeSuggestions } from '../../url_drilldown_scope';
import './index.scss';
import {
  txtAddVariableButtonTitle,
  txtUrlPreviewHelpText,
  txtUrlTemplateSyntaxHelpLinkText,
  txtUrlTemplateVariablesHelpLinkText,
  txtUrlTemplateVariablesFilterPlaceholderText,
  txtUrlTemplateLabel,
  txtUrlTemplateOpenInNewTab,
  txtUrlTemplatePlaceholder,
  txtUrlTemplatePreviewLabel,
  txtUrlTemplatePreviewLinkText,
} from './i18n';

export interface UrlDrilldownCollectConfig {
  config: UrlDrilldownConfig;
  onConfig: (newConfig: UrlDrilldownConfig) => void;
  scope: UrlDrilldownScope;
  syntaxHelpDocsLink?: string;
  variablesHelpDocsLink?: string;
}

export const UrlDrilldownCollectConfig: React.FC<UrlDrilldownCollectConfig> = ({
  config,
  onConfig,
  scope,
  syntaxHelpDocsLink,
  variablesHelpDocsLink,
}) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const urlTemplate = config.url.template ?? '';
  const compiledUrl = React.useMemo(() => {
    try {
      return compile(urlTemplate, scope);
    } catch {
      return urlTemplate;
    }
  }, [urlTemplate, scope]);
  const scopeVariables = React.useMemo(() => buildScopeSuggestions(scope), [scope]);

  function updateUrlTemplate(newUrlTemplate: string) {
    if (config.url.template !== newUrlTemplate) {
      onConfig({
        ...config,
        url: {
          ...config.url,
          template: newUrlTemplate,
        },
      });
    }
  }
  const { error, isValid } = React.useMemo(
    () => validateUrlTemplate({ template: urlTemplate }, scope),
    [urlTemplate, scope]
  );
  const isEmpty = !urlTemplate;
  const isInvalid = !isValid && !isEmpty;
  return (
    <>
      <EuiFormRow
        fullWidth
        isInvalid={isInvalid}
        error={error}
        className={'uaeUrlDrilldownCollectConfig__urlTemplateFormRow'}
        label={txtUrlTemplateLabel}
        helpText={
          syntaxHelpDocsLink && (
            <EuiLink external target={'_blank'} href={syntaxHelpDocsLink}>
              {txtUrlTemplateSyntaxHelpLinkText}
            </EuiLink>
          )
        }
        labelAppend={
          <AddVariableButton
            variables={scopeVariables}
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
        }
      >
        <EuiTextArea
          fullWidth
          isInvalid={isInvalid}
          name="url"
          data-test-subj="urlInput"
          value={urlTemplate}
          placeholder={txtUrlTemplatePlaceholder}
          onChange={(event) => updateUrlTemplate(event.target.value)}
          rows={3}
          inputRef={textAreaRef}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={txtUrlTemplatePreviewLabel}
        labelAppend={
          <EuiText size="xs">
            <EuiLink href={compiledUrl} target="_blank" external>
              {txtUrlTemplatePreviewLinkText}
            </EuiLink>
          </EuiText>
        }
        helpText={txtUrlPreviewHelpText}
      >
        <EuiTextArea
          fullWidth
          name="urlPreview"
          data-test-subj="urlPreview"
          value={compiledUrl}
          disabled={true}
          rows={3}
        />
      </EuiFormRow>
      <EuiFormRow hasChildLabel={false}>
        <EuiCheckbox
          id="openInNewTab"
          name="openInNewTab"
          label={txtUrlTemplateOpenInNewTab}
          checked={config.openInNewTab}
          onChange={() => onConfig({ ...config, openInNewTab: !config.openInNewTab })}
        />
      </EuiFormRow>
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
