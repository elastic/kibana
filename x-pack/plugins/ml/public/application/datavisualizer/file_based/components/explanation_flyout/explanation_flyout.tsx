/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutHeader,
  EuiButtonEmpty,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
  EuiText,
  EuiSubSteps,
} from '@elastic/eui';
import { FindFileStructureResponse } from '../../../../../../common/types/file_datavisualizer';

interface Props {
  results: FindFileStructureResponse;
  closeFlyout(): void;
}
export const ExplanationFlyout: FC<Props> = ({ results, closeFlyout }) => {
  const explanation = results.explanation!;
  return (
    <EuiFlyout onClose={closeFlyout} hideCloseButton size={'m'}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.ml.fileDatavisualizer.explanationFlyout.title"
              defaultMessage="Analysis explanation"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Content explanation={explanation} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              <FormattedMessage
                id="xpack.ml.fileDatavisualizer.explanationFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

const Content: FC<{ explanation: string[] }> = ({ explanation }) => (
  <>
    <EuiText size={'s'}>
      <FormattedMessage
        id="xpack.ml.fileDatavisualizer.explanationFlyout.content"
        defaultMessage="The logical steps that have produced the analysis results."
      />

      <EuiSpacer size="l" />
      <EuiSubSteps>
        <ul style={{ wordBreak: 'break-word' }}>
          {explanation.map((e, i) => (
            <li key={i}>
              {e}
              <EuiSpacer size="s" />
            </li>
          ))}
        </ul>
      </EuiSubSteps>
    </EuiText>
  </>
);
