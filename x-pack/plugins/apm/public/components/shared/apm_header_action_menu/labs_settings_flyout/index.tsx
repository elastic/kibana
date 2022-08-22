/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { Body } from './body';
import { Header } from './header';

export function LabsSettingsFlyout() {
  const [isOpen, setIsOpen] = useState(true);
  const [isLabsChecked, setIsLabsChecked] = useState(false);

  function toggleFlyoutVisibility() {
    setIsOpen((state) => !state);
  }

  return (
    <>
      <EuiButtonEmpty color="text" onClick={toggleFlyoutVisibility}>
        {i18n.translate('xpack.apm.labs', { defaultMessage: 'Labs' })}
      </EuiButtonEmpty>
      {isOpen && (
        <EuiFlyout onClose={toggleFlyoutVisibility}>
          <EuiFlyoutHeader hasBorder>
            <EuiSpacer />
            <Header
              isLabsChecked={isLabsChecked}
              onChangeLabs={setIsLabsChecked}
            />
          </EuiFlyoutHeader>
          <EuiFlyoutBody>{isLabsChecked && <Body />}</EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty>
                  {i18n.translate('xpack.apm.labs.cancel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill disabled={!isLabsChecked}>
                  {i18n.translate('xpack.apm.labs.reload', {
                    defaultMessage: 'Reload to apply changes',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </>
  );
}
