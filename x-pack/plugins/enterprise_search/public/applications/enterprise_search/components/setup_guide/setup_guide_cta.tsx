/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiText, EuiImage } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EuiPanelTo } from '../../../shared/react_router_helpers';
import { PRODUCT_SELECTOR_CALLOUT_HEADING } from '../../constants';

import CtaImage from './assets/getting_started.png';
import './setup_guide_cta.scss';

export const SetupGuideCta: React.FC = () => (
  <EuiPanelTo
    to="/setup_guide"
    paddingSize="l"
    className="enterpriseSearchSetupCta"
    data-test-subj="setupGuideLink"
    hasBorder
    color="transparent"
  >
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
      <EuiFlexItem>
        <EuiTitle size="s">
          <h2>{PRODUCT_SELECTOR_CALLOUT_HEADING}</h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.enterpriseSearch.overview.setupCta.description', {
            defaultMessage:
              'Add search to your app or internal organization with Elastic App Search and Workplace Search. Watch the video to see what you can do when search is made easy.',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiImage src={CtaImage} alt="" className="enterpriseSearchSetupCta__image" />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanelTo>
);
