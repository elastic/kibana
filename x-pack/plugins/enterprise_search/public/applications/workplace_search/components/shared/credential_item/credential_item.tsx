/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { upperFirst } from 'lodash';

import {
  EuiButtonIcon,
  EuiCopy,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiFieldPassword,
  EuiToolTip,
} from '@elastic/eui';

interface ICredentialItemProps {
  label: string;
  value: string;
  testSubj: string;
  hideCopy?: boolean;
}

const inputSelectAll = (e: React.MouseEvent<HTMLInputElement>) => e.currentTarget.select();

export const CredentialItem: React.FC<ICredentialItemProps> = ({
  label,
  value,
  testSubj,
  hideCopy,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      responsive={false}
      data-test-subj={testSubj}
    >
      <EuiFlexItem grow={1}>
        <EuiText size="s">
          <strong>{label}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          {!hideCopy && (
            <EuiFlexItem grow={false}>
              <EuiCopy beforeMessage="Copy to clipboard" afterMessage="Copied!" textToCopy={value}>
                {(copy) => (
                  <EuiButtonIcon
                    aria-label="Copy to Clipboard"
                    onClick={copy}
                    iconType="copy"
                    color="primary"
                  />
                )}
              </EuiCopy>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiToolTip position="top" content={`Show ${label}`}>
              <EuiButtonIcon
                aria-label="Show credential"
                data-test-subj={`Show${upperFirst(testSubj)}`}
                onClick={() => setIsVisible(!isVisible)}
                iconType={isVisible ? 'eyeClosed' : 'eye'}
                color="primary"
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem>
            {!isVisible ? (
              <EuiFieldPassword
                placeholder={label}
                value={value}
                readOnly
                compressed={true}
                disabled
              />
            ) : (
              <EuiFieldText
                readOnly={true}
                placeholder="Compressed"
                data-test-subj={`${testSubj}Input`}
                value={value}
                compressed={true}
                onClick={inputSelectAll}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
