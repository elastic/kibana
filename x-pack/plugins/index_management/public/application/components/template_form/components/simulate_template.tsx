/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiTextColor,
  EuiText,
  EuiSpacer,
  EuiCodeBlock,
} from '@elastic/eui';

interface Props {
  onClose(): void;
  template: { [key: string]: any };
}

export const SimulateTemplate = ({ onClose, template }: Props) => {
  const json = JSON.stringify(template, null, 2);
  const [heightCodeBlock, setHeightCodeBlock] = useState(0);

  useEffect(() => {
    setHeightCodeBlock(
      document.getElementsByClassName('euiFlyoutBody__overflow')[0].clientHeight - 96
    );
  }, []);

  return (
    <EuiFlyout
      onClose={onClose}
      data-test-subj="simulateTemplateFlyout"
      aria-labelledby="simulateTemplateFlyoutTitle"
      size="m"
      maxWidth={500}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="componentTemplatesFlyoutTitle" data-test-subj="title">
            Preview index template
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiTextColor color="subdued">
          <EuiText size="s">
            <p>
              This is the final template that will be applied to your indices based on the
              components templates you have selected and any overrides you&apos;ve added.
            </p>
          </EuiText>
        </EuiTextColor>
      </EuiFlyoutHeader>

      <EuiFlyoutBody data-test-subj="content">
        <EuiCodeBlock style={{ minHeight: `${heightCodeBlock}px` }} lang="json">
          {json}
        </EuiCodeBlock>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              flush="left"
              onClick={onClose}
              data-test-subj="closeDetailsButton"
            >
              <FormattedMessage
                id="xpack.idxMgmt.componentTemplatesFlyout.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="refresh"
              onClick={() => alert('simulating...')}
              data-test-subj="updateSimulationButton"
              fill
            >
              <FormattedMessage
                id="xpack.idxMgmt.componentTemplatesFlyout.closeButtonLabel"
                defaultMessage="Update"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
