/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiText } from '@elastic/eui';
import { EuiPanelTo } from '../../../shared/react_router_helpers';

import CtaImage from './assets/getting_started.png';
import './setup_guide_cta.scss';

export const SetupGuideCta: React.FC = () => (
  <EuiPanelTo to="/setup_guide" paddingSize="l" className="enterpriseSearchSetupCta">
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
      <EuiFlexItem className="enterpriseSearchSetupCta__text">
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.enterpriseSearch.overview.setupCta.title', {
              defaultMessage: 'Enterprise-grade functionality for teams big and small',
            })}
          </h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.enterpriseSearch.overview.setupCta.description', {
            defaultMessage:
              'Add search to your app or internal organization with Elastic App Search and Workplace Search. Watch the video to see what you can do when search is made easy.',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <img src={CtaImage} alt="" className="enterpriseSearchSetupCta__image" />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanelTo>
);
