/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useKibanaUrl } from '../../../hooks/use_kibana_url';

export function Footer() {
  const apmLink = useKibanaUrl('/app/apm');
  return (
    <EuiPanel paddingSize="l">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.apm.onboarding.footer.exploreYourDataDescription"
                defaultMessage="When all steps are complete, you're ready to explore your data."
              />
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="apmTutorialFooterButton"
            fill
            href={apmLink}
          >
            {i18n.translate('xpack.apm.onboarding.footer.cta', {
              defaultMessage: 'Launch APM',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
