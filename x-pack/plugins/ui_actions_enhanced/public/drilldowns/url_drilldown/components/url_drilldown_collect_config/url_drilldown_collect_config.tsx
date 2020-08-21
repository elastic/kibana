/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFormRow,
  EuiLink,
  EuiPopover,
  EuiSwitch,
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
        <EuiSwitch
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
        <EuiButtonIcon
          data-test-subj={`addVariable`}
          onClick={() => {
            setIsVariablesPopoverOpen(true);
          }}
          iconType="indexOpen"
          title={txtAddVariableButtonTitle}
          aria-label={txtAddVariableButtonTitle}
        />
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
