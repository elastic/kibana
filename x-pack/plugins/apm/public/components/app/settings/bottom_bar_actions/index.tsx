/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  unsavedChangesCount: number;
  isLoading: boolean;
  onDiscardChanges: () => void;
  onSave: () => void;
  saveLabel: string;
}

export function BottomBarActions({
  isLoading,
  onDiscardChanges,
  onSave,
  unsavedChangesCount,
  saveLabel,
}: Props) {
  return (
    <EuiBottomBar paddingSize="s">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem
          grow={false}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <EuiHealth color="warning" />
          <EuiText color="ghost">
            {i18n.translate('xpack.apm.bottomBarActions.unsavedChanges', {
              defaultMessage:
                '{unsavedChangesCount, plural, =0{0 unsaved changes} one {1 unsaved change} other {# unsaved changes}} ',
              values: { unsavedChangesCount },
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty color="ghost" onClick={onDiscardChanges}>
                {i18n.translate(
                  'xpack.apm.bottomBarActions.discardChangesButton',
                  {
                    defaultMessage: 'Discard changes',
                  }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={onSave}
                fill
                isLoading={isLoading}
                color="success"
                iconType="check"
              >
                {saveLabel}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiBottomBar>
  );
}
