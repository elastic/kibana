/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';

import { MODE as DATAVISUALIZER_MODE } from '../file_datavisualizer_view/constants';

interface BottomBarProps {
  mode: DATAVISUALIZER_MODE;
  onChangeMode: (mode: DATAVISUALIZER_MODE) => void;
  onCancel: () => void;
  disableImport?: boolean;
}

/**
 * Bottom bar component for Data Visualizer page.
 */
export const BottomBar: FC<BottomBarProps> = ({ mode, onChangeMode, onCancel, disableImport }) => {
  if (mode === DATAVISUALIZER_MODE.READ) {
    return (
      <EuiBottomBar>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="top"
              content={
                disableImport ? (
                  <FormattedMessage
                    id="xpack.ml.fileDatavisualizer.bottomBar.missingImportPrivilegesMessage"
                    defaultMessage="You don't have the privileges required to import data"
                  />
                ) : null
              }
            >
              <EuiButton
                fill
                isDisabled={disableImport}
                onClick={() => onChangeMode(DATAVISUALIZER_MODE.IMPORT)}
              >
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.bottomBar.readMode.importButtonLabel"
                  defaultMessage="Import"
                />
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty color="ghost" onClick={() => onCancel()}>
              <FormattedMessage
                id="xpack.ml.fileDatavisualizer.bottomBar.readMode.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBottomBar>
    );
  } else {
    return (
      <EuiBottomBar>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton color="ghost" onClick={() => onChangeMode(DATAVISUALIZER_MODE.READ)}>
              <FormattedMessage
                id="xpack.ml.fileDatavisualizer.bottomBar.backButtonLabel"
                defaultMessage="Back"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty color="ghost" onClick={() => onCancel()}>
              <FormattedMessage
                id="xpack.ml.fileDatavisualizer.bottomBar.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBottomBar>
    );
  }
};
