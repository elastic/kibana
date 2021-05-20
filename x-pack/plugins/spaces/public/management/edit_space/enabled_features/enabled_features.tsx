/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { ApplicationStart } from 'src/core/public';
import type { Space } from 'src/plugins/spaces_oss/common';

import type { KibanaFeatureConfig } from '../../../../../features/public';
import { SectionPanel } from '../section_panel';
import { FeatureTable } from './feature_table';

interface Props {
  space: Partial<Space>;
  features: KibanaFeatureConfig[];
  onChange: (space: Partial<Space>) => void;
  getUrlForApp: ApplicationStart['getUrlForApp'];
}

export const EnabledFeatures: FunctionComponent<Props> = (props) => (
  <SectionPanel
    title={i18n.translate('xpack.spaces.management.manageSpacePage.customizeVisibleFeatures', {
      defaultMessage: 'Features',
    })}
    description={i18n.translate(
      'xpack.spaces.management.manageSpacePage.customizeVisibleFeatures',
      {
        defaultMessage: 'Customize visible features',
      }
    )}
    data-test-subj="enabled-features-panel"
  >
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.spaces.management.enabledSpaceFeatures.enableFeaturesInSpaceMessage"
              defaultMessage="Set feature visibility for this space"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.spaces.management.enabledSpaceFeatures.notASecurityMechanismMessage"
              defaultMessage="Hidden features will be obscured from the user interface, but will not be disabled. If you wish to secure access to features, manage security roles."
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <FeatureTable features={props.features} space={props.space} onChange={props.onChange} />
      </EuiFlexItem>
    </EuiFlexGroup>
  </SectionPanel>
);
