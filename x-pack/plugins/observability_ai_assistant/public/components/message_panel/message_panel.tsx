/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

interface Props {
  error?: Error;
  body?: React.ReactNode;
  controls?: React.ReactNode;
}

export function MessagePanel(props: Props) {
  return (
    <>
      {props.body}
      {props.error ? (
        <>
          {props.body ? <EuiSpacer size="xs" /> : null}
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="alert" color="danger" size="s" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="danger">
                {i18n.translate('xpack.observabilityAiAssistant.messagePanel.failedLoadingText', {
                  defaultMessage: 'Failed to load response',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : null}
      {props.controls ? (
        <>
          <EuiSpacer size="m" />
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="s" />
          {props.controls}
        </>
      ) : null}
    </>
  );
}
