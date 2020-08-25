/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useState } from 'react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiCheckbox,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { UrlDrilldownConfig, UrlDrilldownScope } from '../../types';
import { compile } from '../../url_template';
import { validateUrlTemplate } from '../../url_validation';
import { buildScopeSuggestions } from '../../url_drilldown_scope';
import './index.scss';
import {
  txtAddVariableButtonTitle,
  txtUrlTemplateHelpLinkText,
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
}

export const UrlDrilldownCollectConfig: React.FC<UrlDrilldownCollectConfig> = ({
  config,
  onConfig,
  scope,
  syntaxHelpDocsLink,
}: UrlDrilldownCollectConfig) => {
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
              {txtUrlTemplateHelpLinkText}
            </EuiLink>
          )
        }
        labelAppend={
          <AddVariableButton
            variables={scopeVariables}
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
}: {
  variables: string[];
  onSelect: (variable: string) => void;
}) {
  const [isVariablesPopoverOpen, setIsVariablesPopoverOpen] = useState<boolean>(false);

  const renderVariables = () =>
    variables.map((variable: string) => (
      <EuiContextMenuItem
        key={variable}
        data-test-subj={`variableButton-${variable}`}
        onClick={() => {
          onSelect(variable);
          setIsVariablesPopoverOpen(false);
        }}
      >
        {`{{${variable}}}`}
      </EuiContextMenuItem>
    ));

  return (
    <EuiPopover
      button={
        <EuiText size="xs">
          <EuiLink onClick={() => setIsVariablesPopoverOpen(true)}>
            {txtAddVariableButtonTitle} <EuiIcon type="indexOpen" />
          </EuiLink>
        </EuiText>
      }
      isOpen={isVariablesPopoverOpen}
      closePopover={() => setIsVariablesPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      withTitle
    >
      <EuiContextMenuPanel title={txtAddVariableButtonTitle} items={renderVariables()} />
    </EuiPopover>
  );
}
