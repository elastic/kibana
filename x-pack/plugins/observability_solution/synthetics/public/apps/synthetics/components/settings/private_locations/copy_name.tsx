/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiCopy, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

export const CopyName = ({ text }: { text: string }) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText>{text}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCopy textToCopy={text}>
          {(copy) => (
            <EuiButtonIcon
              data-test-subj="syntheticsCopyNameButton"
              color="text"
              iconType="copy"
              onClick={copy}
              aria-label={i18n.translate('xpack.synthetics.copyName.copyNameButtonIconLabel', {
                defaultMessage: 'Copy name',
              })}
            />
          )}
        </EuiCopy>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
