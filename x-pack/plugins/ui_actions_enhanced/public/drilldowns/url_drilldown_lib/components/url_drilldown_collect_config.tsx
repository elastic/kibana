/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
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
import { getFlattenedObject } from '../../../../../../../src/core/public';
import { UrlDrilldownConfig, UrlDrilldownScope } from '../types';
import { compile } from '../url_template';
import { isValidUrl } from '../utils';

function buildVariableListForSuggestions(scope: UrlDrilldownScope): string[] {
  return Object.keys(getFlattenedObject(scope));
}

export interface UrlDrilldownCollectConfig {
  config: UrlDrilldownConfig;
  onConfig: (newConfig: UrlDrilldownConfig) => void;
  scope: UrlDrilldownScope;
}

export const UrlDrilldownCollectConfig: React.FC<UrlDrilldownCollectConfig> = ({
  config,
  onConfig,
  scope,
}: UrlDrilldownCollectConfig) => {
  const compiledUrl = React.useMemo(() => compile(config.url, scope), [config.url, scope]);
  const variables = React.useMemo(() => buildVariableListForSuggestions(scope), [scope]);
  const isValid = !compiledUrl || isValidUrl(compiledUrl);

  return (
    <>
      <EuiFormRow
        fullWidth
        isInvalid={!isValid}
        label={'Enter target URL'}
        labelAppend={
          <AddVariableButton
            variables={variables}
            onSelect={(variable: string) => {
              // TODO: better insert logic depending on selection?
              onConfig({ ...config, url: config.url + `{{${variable}}}` });
            }}
          />
        }
      >
        <EuiTextArea
          fullWidth
          isInvalid={!isValid}
          name="url"
          data-test-subj="urlInput"
          value={config.url}
          placeholder={'https://google.com/?q={{event.filter.value}}'}
          onChange={(event) => onConfig({ ...config, url: event.target.value })}
          onBlur={() => {
            if (!compiledUrl) return;
            if (/https?:\/\//.test(compiledUrl)) return;
            onConfig({ ...config, url: 'https://' + config.url });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={'Target URL preview'}
        isInvalid={!isValid}
        labelAppend={
          <EuiText size="xs">
            <EuiLink href={compiledUrl} target="_blank" external>
              Preview
            </EuiLink>
          </EuiText>
        }
      >
        <EuiTextArea
          fullWidth
          name="urlPreview"
          isInvalid={!isValid}
          data-test-subj="urlPreview"
          value={compiledUrl}
          disabled={true}
        />
      </EuiFormRow>
      <EuiFormRow hasChildLabel={false}>
        <EuiSwitch
          name="openInNewTab"
          label="Open in new tab?"
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
    variables.map((variable: string, i: number) => (
      <EuiContextMenuItem
        key={variable}
        data-test-subj={`variableMenuButton-${i}`}
        icon="empty"
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
          data-test-subj={`addUrlContextVariable`}
          onClick={() => setIsVariablesPopoverOpen(true)}
          iconType="indexOpen"
          title={'Add variable'}
          aria-label={'Add variable'}
        />
      }
      isOpen={isVariablesPopoverOpen}
      closePopover={() => setIsVariablesPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel className="messageVariablesPanel" items={renderVariables()} />
    </EuiPopover>
  );
}
