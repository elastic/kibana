/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
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

import { serializers } from '../../../../shared_imports';
import { serializeV2Template } from '../../../../../common/lib/template_serialization';
import { simulateIndexTemplate } from '../../../services';

const { stripEmptyFields } = serializers;

interface Props {
  onClose(): void;
  getTemplate: () => { [key: string]: any };
}

export const SimulateTemplate = ({ onClose, getTemplate }: Props) => {
  const [heightCodeBlock, setHeightCodeBlock] = useState(0);
  const [templatePreview, setTemplatePreview] = useState('{}');
  const [count, setCount] = useState(1);
  const refCount = useRef(0);

  useEffect(() => {
    setHeightCodeBlock(
      document.getElementsByClassName('euiFlyoutBody__overflow')[0].clientHeight - 96
    );
  }, []);

  const updatePreview = useCallback(async () => {
    if (count > refCount.current) {
      refCount.current = count;
      const indexTemplate = await getTemplate();
      const { data, error } = await simulateIndexTemplate(
        serializeV2Template(stripEmptyFields(indexTemplate) as any)
      );
      setTemplatePreview(JSON.stringify(data ?? error, null, 2));
    }
  }, [count, getTemplate]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  return (
    <EuiFlyout
      onClose={onClose}
      data-test-subj="simulateTemplateFlyout"
      aria-labelledby="simulateTemplateFlyoutTitle"
      size="m"
      maxWidth={720}
      style={{ minWidth: '680px' }}
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
          {templatePreview}
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
              onClick={() => setCount((prev) => ++prev)}
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
