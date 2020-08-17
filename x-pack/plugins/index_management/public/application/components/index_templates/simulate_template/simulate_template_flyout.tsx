/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
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
} from '@elastic/eui';

import { SimulateTemplate } from './simulate_template';

export interface Props {
  onClose(): void;
  getTemplate: () => { [key: string]: any };
}

export const defaultFlyoutProps = {
  'data-test-subj': 'simulateTemplateFlyout',
  'aria-labelledby': 'simulateTemplateFlyoutTitle',
};

export const SimulateTemplateFlyoutContent = ({ onClose, getTemplate }: Props) => {
  const isMounted = useRef(false);
  const [heightCodeBlock, setHeightCodeBlock] = useState(0);
  const [template, setTemplate] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    setHeightCodeBlock(
      document.getElementsByClassName('euiFlyoutBody__overflow')[0].clientHeight - 96
    );
  }, []);

  const updatePreview = useCallback(async () => {
    const indexTemplate = await getTemplate();
    setTemplate(indexTemplate);
  }, [getTemplate]);

  useEffect(() => {
    if (isMounted.current === false) {
      updatePreview();
    }
    isMounted.current = true;
  }, [updatePreview]);

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="componentTemplatesFlyoutTitle" data-test-subj="title">
            <FormattedMessage
              id="xpack.idxMgmt.simulateTemplate.title"
              defaultMessage="Preview index template"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiTextColor color="subdued">
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.simulateTemplate.descriptionText"
                defaultMessage="This is the final template that will be applied to your indices based on the
                components templates you have selected and any overrides you've added."
              />
            </p>
          </EuiText>
        </EuiTextColor>
      </EuiFlyoutHeader>

      <EuiFlyoutBody data-test-subj="content">
        <SimulateTemplate template={template} minHeightCodeBlock={`${heightCodeBlock}px`} />
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
                id="xpack.idxMgmt.simulateTemplate.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="refresh"
              onClick={updatePreview}
              data-test-subj="updateSimulationButton"
              fill
            >
              <FormattedMessage
                id="xpack.idxMgmt.simulateTemplate.updateButtonLabel"
                defaultMessage="Update"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
