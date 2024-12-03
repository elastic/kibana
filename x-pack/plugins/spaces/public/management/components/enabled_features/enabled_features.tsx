/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

import type { KibanaFeatureConfig } from '@kbn/features-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';

import { FeatureTable } from './feature_table';
import type { Space } from '../../../../common';
import { SectionPanel } from '../section_panel';

interface Props {
  space: Partial<Space>;
  features: KibanaFeatureConfig[];
  onChange: (space: Partial<Space>) => void;
}

export const EnabledFeatures: FunctionComponent<Props> = (props) => {
  return (
    <SectionPanel dataTestSubj="enabled-features-panel">
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.spaces.management.enabledSpaceFeatures.enableFeaturesInSpaceMessage"
                defaultMessage="Set feature visibility"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.spaces.management.enabledSpaceFeatures.chooseFeaturesToDisplayMessage"
                defaultMessage="Choose the features to display in the navigation menu for users of this space. If you want to focus on a single solution, you can simplify the navigation even more by selecting a {solutionView}."
                values={{
                  solutionView: (
                    <FormattedMessage
                      id="xpack.spaces.management.enabledSpaceFeatures.chooseFeaturesToDisplaySolutionViewText"
                      defaultMessage="Solution view"
                    />
                  ),
                }}
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
};
