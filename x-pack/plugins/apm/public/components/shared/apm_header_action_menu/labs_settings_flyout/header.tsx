/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormFieldset,
  EuiIcon,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  isLabsChecked: boolean;
  onChangeLabs: (isChecked: boolean) => void;
}

export function Header({ isLabsChecked, onChangeLabs }: Props) {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type="beaker" size="xl" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle>
                  <h2>Labs</h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormFieldset legend={{ children: 'labs:apm-ui' }}>
              <EuiSwitch
                label={
                  isLabsChecked
                    ? i18n.translate('xpack.apm.labs.checked', {
                        defaultMessage: 'On',
                      })
                    : i18n.translate('xpack.apm.labs.unchecked', {
                        defaultMessage: 'Off',
                      })
                }
                checked={isLabsChecked}
                onChange={(e) => onChangeLabs(e.target.checked)}
              />
            </EuiFormFieldset>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued" size="s">
          {i18n.translate('xpack.apm.labs.description', {
            defaultMessage:
              'Turn on for automatically opt-in to future technical preview features released.',
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
