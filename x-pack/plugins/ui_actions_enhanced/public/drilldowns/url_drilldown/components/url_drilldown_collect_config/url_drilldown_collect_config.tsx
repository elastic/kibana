/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import {
  UrlTemplateEditor,
  UrlTemplateEditorVariable,
} from '../../../../../../../../src/plugins/kibana_react/public';

export interface UrlDrilldownCollectConfig {
  config: UrlDrilldownConfig;
  variables: UrlTemplateEditorVariable[];
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
    <VariablePopover
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
        <UrlTemplateEditor
          value={urlTemplate}
          onChange={(newUrlTemplate) => updateUrlTemplate(newUrlTemplate)}
          variables={variables}
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
