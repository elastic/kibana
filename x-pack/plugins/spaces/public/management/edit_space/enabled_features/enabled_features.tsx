/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

import type { KibanaFeatureConfig } from '@kbn/features-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { Space } from '../../../../common';
import { SectionPanel } from '../section_panel';
import { FeatureTable } from './feature_table';

interface Props {
  space: Partial<Space>;
  features: KibanaFeatureConfig[];
  onChange: (space: Partial<Space>) => void;
}

export const EnabledFeatures: FunctionComponent<Props> = (props) => {
  const { services } = useKibana();
  const canManageRoles = services.application?.capabilities.management?.security?.roles === true;

  return (
    <SectionPanel
      title={i18n.translate('xpack.spaces.management.manageSpacePage.featuresTitle', {
        defaultMessage: 'Features',
      })}
      data-test-subj="enabled-features-panel"
    >
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
                id="xpack.spaces.management.enabledSpaceFeatures.notASecurityMechanismMessage"
                defaultMessage="Hidden features are removed from the user interface, but not disabled. To secure access to features, {manageRolesLink}."
                values={{
                  manageRolesLink: canManageRoles ? (
                    <EuiLink
                      href={services.application?.getUrlForApp('management', {
                        path: '/security/roles',
                      })}
                    >
                      <FormattedMessage
                        id="xpack.spaces.management.enabledSpaceFeatures.manageRolesLinkText"
                        defaultMessage="manage security roles"
                      />
                    </EuiLink>
                  ) : (
                    <FormattedMessage
                      id="xpack.spaces.management.enabledSpaceFeatures.manageRolesLinkText"
                      defaultMessage="manage security roles"
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
