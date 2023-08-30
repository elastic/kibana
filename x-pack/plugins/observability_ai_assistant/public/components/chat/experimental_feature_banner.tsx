/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiImage,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import illustration from '../../assets/illustration.svg';

export function ExperimentalFeatureBanner() {
  return (
    <>
      <EuiPanel color="warning" paddingSize="s" hasBorder={false}>
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiImage
              src={illustration}
              alt="Decorative image"
              size="xxs"
              width={100}
              height={30}
            />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiFlexGroup
              direction="row"
              gutterSize="xs"
              alignItems="center"
              justifyContent="center"
            >
              <FormattedMessage
                id="xpack.observabilityAiAssistant.experimentalFunctionBanner.title"
                defaultMessage="This feature is currently in {techPreview} and may contain issues."
                values={{ techPreview: <strong>Tech Preview</strong> }}
              />
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton color="warning" href="https://ela.st/obs-ai-assistant" target="_blank">
              {i18n.translate(
                'xpack.observabilityAiAssistant.experimentalFunctionBanner.feedbackButton',
                { defaultMessage: 'Give feedback' }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiHorizontalRule margin="none" />
    </>
  );
}
