/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiIcon,
  EuiText,
} from '@elastic/eui';

export interface WithDiagnoseButtonProps {
  showDiagnoseButton: boolean;
  onDiagnoseClick?: () => void;
}

/** P must include the diagnose props (optional) so they can be destructured and passed through. */
// This HOC wraps a component and adds a diagnose button at the bottom if showDiagnoseButton is true.
export const withDiagnoseButton = <P extends Partial<WithDiagnoseButtonProps>>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<P> => {
  function ComponentWithDiagnoseButton(props: P) {
    const { showDiagnoseButton, onDiagnoseClick } = props;
    return (
      <>
        <WrappedComponent {...props} />
        {showDiagnoseButton && (
          <>
            <EuiHorizontalRule margin="s" />
            <EuiPanel color="subdued" hasBorder={false} paddingSize="m">
              <EuiFlexGroup gutterSize="none" responsive={false} direction="column">
                <EuiFlexItem>
                  <EuiText size="s">
                    <EuiIcon type="crossInCircle" color="warning" size="m" aria-hidden={true} />{' '}
                    <strong>
                      {i18n.translate('xpack.apm.serviceMap.diagnosisTitle', {
                        defaultMessage: 'Missing connection?',
                      })}
                    </strong>
                    <EuiButtonEmpty
                      aria-label={i18n.translate(
                        'xpack.apm.componentWithDiagnoseButton.diagnosethisconnectionButton.ariaLabel',
                        { defaultMessage: 'Diagnose this connection' }
                      )}
                      data-test-subj="diagnose-connection-button"
                      onClick={onDiagnoseClick}
                      size="s"
                    >
                      {i18n.translate('xpack.apm.serviceMap.diagnoseConnectionButtonText', {
                        defaultMessage: 'Open diagnostic tool',
                      })}
                    </EuiButtonEmpty>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </>
        )}
      </>
    );
  }
  return ComponentWithDiagnoseButton;
};
