/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isString } from 'lodash';
import { EuiBetaBadge, EuiTitle, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import { TruncatedText } from '../truncated_text';
import { ReleasePhase } from '../types';
import * as i18n from './translations';

interface Props {
  title: string | React.ReactNode;
  releasePhase: ReleasePhase;
  children?: React.ReactNode;
}

const ExperimentalBadge: React.FC = () => (
  <EuiBetaBadge
    label={i18n.EXPERIMENTAL_LABEL}
    tooltipContent={i18n.EXPERIMENTAL_DESC}
    tooltipPosition="bottom"
  />
);

ExperimentalBadge.displayName = 'ExperimentalBadge';

const BetaBadge: React.FC = () => (
  <EuiBetaBadge label={i18n.BETA_LABEL} tooltipContent={i18n.BETA_DESC} tooltipPosition="bottom" />
);

BetaBadge.displayName = 'BetaBadge';

const TitleComponent: React.FC<Props> = ({ title, releasePhase, children }) => (
  <EuiFlexGroup alignItems="baseline" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1 data-test-subj="header-page-title">
              {isString(title) ? <TruncatedText text={title} /> : title}
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      {releasePhase === 'experimental' && <ExperimentalBadge />}
      {releasePhase === 'beta' && <BetaBadge />}
    </EuiFlexItem>
  </EuiFlexGroup>
);

TitleComponent.displayName = 'Title';
export const Title = React.memo(TitleComponent);
