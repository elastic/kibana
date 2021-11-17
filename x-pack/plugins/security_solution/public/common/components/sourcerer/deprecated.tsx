/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiCallOut,
  EuiLink,
  EuiText,
  EuiTextColor,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import React from 'react';
import * as i18n from './translations';
import { Blockquote, ResetButton } from './helpers';

interface Props {
  onClick: () => void;
  onClose: () => void;
  onUpdate: () => void;
  selectedPatterns: string[];
}

export const DeprecatedSourcerer = React.memo<Props>(
  ({ onClose, onClick, onUpdate, selectedPatterns }) => (
    <>
      <EuiCallOut
        color="warning"
        data-test-subj="sourcerer-deprecated-callout"
        iconType="alert"
        size="s"
        title={i18n.CALL_OUT_DEPRECATED_TITLE}
      />
      <EuiSpacer size="s" />
      <EuiText size="s">
        <EuiTextColor color="subdued">
          <p>
            <FormattedMessage
              id="xpack.securitySolution.indexPatterns.currentPatterns"
              defaultMessage="The current index patterns in this timeline are: {callout}"
              values={{
                callout: <Blockquote>{selectedPatterns.join(', ')}</Blockquote>,
              }}
            />
            <FormattedMessage
              id="xpack.securitySolution.indexPatterns.toggleToNewSourcerer"
              defaultMessage="We have preserved your timeline by creating a temporary data view. If you'd like to modify your data, we can recreate your temporary data view with the new data view selector. You can also manually select a data view {link}."
              values={{
                link: (
                  <EuiLink onClick={onClick}>
                    <FormattedMessage
                      id="xpack.securitySolution.indexPatterns.toggleToNewSourcerer.link"
                      defaultMessage="here"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiTextColor>
      </EuiText>
      <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <ResetButton
            aria-label={i18n.INDEX_PATTERNS_CLOSE}
            data-test-subj="sourcerer-deprecated-close"
            flush="left"
            onClick={onClose}
            title={i18n.INDEX_PATTERNS_CLOSE}
          >
            {i18n.INDEX_PATTERNS_CLOSE}
          </ResetButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="sourcerer-deprecated-update"
            fill
            fullWidth
            onClick={onUpdate}
            size="s"
          >
            {i18n.UPDATE_INDEX_PATTERNS}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  )
);

DeprecatedSourcerer.displayName = 'DeprecatedSourcerer';
