/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { SVGProps } from 'react';
import { EuiButton, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function NewChatButton(
  props: React.ComponentProps<typeof EuiButton> & { collapsed?: boolean }
) {
  const { collapsed, ...nextProps } = props;
  return !props.collapsed ? (
    <EuiButton data-test-subj="observabilityAiAssistantNewChatButton" fill {...nextProps}>
      <EuiIconNewChat style={{ fill: 'white' }} />
      {i18n.translate('xpack.observabilityAiAssistant.newChatButton', {
        defaultMessage: 'New chat',
      })}
    </EuiButton>
  ) : (
    <EuiButtonIcon
      data-test-subj="observabilityAiAssistantNewChatButtonButton"
      iconType={EuiIconNewChat}
      size="xs"
      {...nextProps}
    />
  );
}

// To-do: replace with Eui icon once https://github.com/elastic/eui/pull/7524 is merged.
export function EuiIconNewChat({ ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16" {...props}>
      <path d="M8 4a.5.5 0 0 1 .5.5V6H10a.5.5 0 0 1 0 1H8.5v1.5a.5.5 0 0 1-1 0V7H6a.5.5 0 0 1 0-1h1.5V4.5A.5.5 0 0 1 8 4Z" />
      <path
        fillRule="evenodd"
        d="M1 4a2.5 2.5 0 0 1 2.5-2.5h9A2.5 2.5 0 0 1 15 4v5a2.5 2.5 0 0 1-2.5 2.5H7.707L4.5 14.707V11.5h-1A2.5 2.5 0 0 1 1 9V4Zm2.5-1.5A1.5 1.5 0 0 0 2 4v5a1.5 1.5 0 0 0 1.5 1.5h2v1.793L7.293 10.5H12.5A1.5 1.5 0 0 0 14 9V4a1.5 1.5 0 0 0-1.5-1.5h-9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
