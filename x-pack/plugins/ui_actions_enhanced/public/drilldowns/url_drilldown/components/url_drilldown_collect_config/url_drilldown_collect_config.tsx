/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import {
  EuiFormRow,
  EuiLink,
  EuiSwitch,
  EuiAccordion,
  EuiSpacer,
  EuiPanel,
  EuiTextColor,
} from '@elastic/eui';
import { monaco } from '@kbn/monaco';
import { UrlDrilldownConfig } from '../../types';
import './index.scss';
import {
  txtUrlTemplateSyntaxHelpLinkText,
  txtUrlTemplateLabel,
  txtUrlTemplateOpenInNewTab,
  txtUrlTemplateAdditionalOptions,
  txtUrlTemplateEncodeUrl,
  txtUrlTemplateEncodeDescription,
} from './i18n';
import { VariablePopover } from '../variable_popover';
import { UrlTemplateEditor, UrlTemplateEditorVariable } from '@kbn/kibana-react-plugin/public';

export interface UrlDrilldownCollectConfigProps {
  config: UrlDrilldownConfig;
  variables: UrlTemplateEditorVariable[];
  exampleUrl: string;
  onConfig: (newConfig: UrlDrilldownConfig) => void;
  syntaxHelpDocsLink?: string;
  variablesHelpDocsLink?: string;
}

export const UrlDrilldownCollectConfig: React.FC<UrlDrilldownCollectConfigProps> = ({
  config,
  variables,
  exampleUrl,
  onConfig,
  syntaxHelpDocsLink,
  variablesHelpDocsLink,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isPristine, setIsPristine] = React.useState(true);
  const urlTemplate = config.url.template ?? '';

  function updateUrlTemplate(newUrlTemplate: string) {
    if (config.url.template !== newUrlTemplate) {
      setIsPristine(false);
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
  const isInvalid = !isPristine && isEmpty;
  const variablesDropdown = (
    <VariablePopover
      variables={variables}
      variablesHelpLink={variablesHelpDocsLink}
      onSelect={(variable: string) => {
        const editor = editorRef.current;
        if (!editor) return;

        editor.trigger('keyboard', 'type', {
          text: '{{' + variable + '}}',
        });
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
        <UrlTemplateEditor
          variables={variables}
          value={urlTemplate}
          placeholder={exampleUrl}
          onChange={(newUrlTemplate) => updateUrlTemplate(newUrlTemplate)}
          onEditor={(editor) => {
            editorRef.current = editor;
          }}
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
