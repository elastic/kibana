/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  EuiTab,
  EuiTabs,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { LatencyCorrelations } from './latency_correlations';
import { ErrorCorrelations } from './error_correlations';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { createHref } from '../../shared/Links/url_helpers';

const latencyTab = {
  key: 'latency',
  label: i18n.translate('xpack.apm.correlations.tabs.latencyLabel', {
    defaultMessage: 'Latency',
  }),
  component: LatencyCorrelations,
};
const errorRateTab = {
  key: 'errorRate',
  label: i18n.translate('xpack.apm.correlations.tabs.errorRateLabel', {
    defaultMessage: 'Error rate',
  }),
  component: ErrorCorrelations,
};
const tabs = [latencyTab, errorRateTab];

export function Correlations() {
  const { urlParams } = useUrlParams();
  const history = useHistory();
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [currentTab, setCurrentTab] = useState(latencyTab.key);
  const { component: TabContent } =
    tabs.find((tab) => tab.key === currentTab) ?? latencyTab;

  return (
    <>
      <EuiButton
        onClick={() => {
          setIsFlyoutVisible(true);
        }}
        iconType="visTagCloud"
      >
        {i18n.translate('xpack.apm.correlations.buttonLabel', {
          defaultMessage: 'Explore correlations',
        })}
      </EuiButton>

      <EuiSpacer size="s" />

      {isFlyoutVisible && (
        <EuiPortal>
          <EuiFlyout
            size="m"
            ownFocus
            onClose={() => setIsFlyoutVisible(false)}
          >
            <EuiFlyoutHeader hasBorder aria-labelledby="correlations-flyout">
              <EuiTitle>
                <h2 id="correlations-flyout">
                  {i18n.translate('xpack.apm.correlations.title', {
                    defaultMessage: 'Correlations',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              {urlParams.kuery ? (
                <>
                  <EuiCallOut size="m">
                    <span>
                      {i18n.translate(
                        'xpack.apm.correlations.filteringByLabel',
                        { defaultMessage: 'Filtering by' }
                      )}
                    </span>
                    <EuiCode>{urlParams.kuery}</EuiCode>
                    <EuiLink
                      href={createHref(history, { query: { kuery: '' } })}
                    >
                      <EuiButtonEmpty iconType="cross">
                        {i18n.translate(
                          'xpack.apm.correlations.clearFiltersLabel',
                          { defaultMessage: 'Clear' }
                        )}
                      </EuiButtonEmpty>
                    </EuiLink>
                  </EuiCallOut>
                  <EuiSpacer />
                </>
              ) : null}

              <EuiCallOut
                size="s"
                title={i18n.translate(
                  'xpack.apm.correlations.experimentalWarning.title',
                  { defaultMessage: 'Experimental' }
                )}
                color="warning"
                iconType="alert"
              >
                <p>
                  {i18n.translate(
                    'xpack.apm.correlations.experimentalWarning.text',
                    {
                      defaultMessage:
                        'Correlations is an experimental feature and in active development. Bugs and surprises are to be expected but let us know your feedback so we can improve it.',
                    }
                  )}
                </p>
              </EuiCallOut>

              <EuiSpacer />
              <EuiTabs>
                {tabs.map(({ key, label }) => (
                  <EuiTab
                    key={key}
                    isSelected={key === currentTab}
                    onClick={() => {
                      setCurrentTab(key);
                    }}
                  >
                    {label}
                  </EuiTab>
                ))}
              </EuiTabs>
              <EuiSpacer />
              <TabContent onClose={() => setIsFlyoutVisible(false)} />
            </EuiFlyoutBody>
          </EuiFlyout>
        </EuiPortal>
      )}
    </>
  );
}
