/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiPortal,
  EuiCode,
  EuiLink,
  EuiCallOut,
  EuiButton,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { enableCorrelations } from '../../../../common/ui_settings_keys';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { LatencyCorrelations } from './LatencyCorrelations';
import { ErrorCorrelations } from './ErrorCorrelations';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { createHref } from '../../shared/Links/url_helpers';

export function Correlations() {
  const { uiSettings } = useApmPluginContext().core;
  const { urlParams } = useUrlParams();
  const history = useHistory();
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  if (!uiSettings.get(enableCorrelations)) {
    return null;
  }

  return (
    <>
      <EuiButton
        onClick={() => {
          setIsFlyoutVisible(true);
        }}
      >
        View correlations
      </EuiButton>

      {isFlyoutVisible && (
        <EuiPortal>
          <EuiFlyout
            size="l"
            ownFocus
            onClose={() => setIsFlyoutVisible(false)}
          >
            <EuiFlyoutHeader hasBorder aria-labelledby="correlations-flyout">
              <EuiTitle>
                <h2 id="correlations-flyout">Correlations</h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              {urlParams.kuery ? (
                <EuiCallOut size="m">
                  <span>Filtering by</span>
                  <EuiCode>{urlParams.kuery}</EuiCode>
                  <EuiLink href={createHref(history, { query: { kuery: '' } })}>
                    <EuiButtonEmpty iconType="cross">Clear</EuiButtonEmpty>
                  </EuiLink>
                </EuiCallOut>
              ) : null}

              <LatencyCorrelations />
              <ErrorCorrelations />
            </EuiFlyoutBody>
          </EuiFlyout>
        </EuiPortal>
      )}
    </>
  );
}
