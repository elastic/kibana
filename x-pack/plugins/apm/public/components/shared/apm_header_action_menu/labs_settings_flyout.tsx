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
  EuiFormFieldset,
  EuiIcon,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

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
                        showLabel={false}
                        label=""
                        checked={isLabsChecked}
                        onChange={(e) => setIsLabsChecked(e.target.checked)}
                      />
                    </EuiFormFieldset>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  {i18n.translate('xpack.apm.labs.description', {
                    defaultMessage:
                      'Turn on for automatically opt-in to future tech preview features released.',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>{isLabsChecked && <>body</>}</EuiFlyoutBody>
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
