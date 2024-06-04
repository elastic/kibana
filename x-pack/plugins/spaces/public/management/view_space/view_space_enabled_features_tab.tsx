/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';

import type { KibanaFeature } from '@kbn/features-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { Space } from '../../../common';
import { FeatureTable } from '../edit_space/enabled_features/feature_table';

interface Props {
  space: Space;
  features: KibanaFeature[];
}

export const ViewSpaceEnabledFeatures: FC<Props> = ({ features, space }) => {
  const { services } = useKibana();

  if (!features) {
    return null;
  }

  const canManageRoles = services.application?.capabilities.management?.security?.roles === true;

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.spaces.management.viewSpaceFeatures.enableFeaturesInSpaceMessage"
              defaultMessage="Set feature visibility"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.spaces.management.viewSpaceFeatures.notASecurityMechanismMessage"
              defaultMessage="Hidden features are removed from the user interface, but not disabled. To secure access to features, {manageRolesLink}."
              values={{
                manageRolesLink: canManageRoles ? (
                  <EuiLink
                    href={services.application?.getUrlForApp('management', {
                      path: '/security/roles',
                    })}
                  >
                    <FormattedMessage
                      id="xpack.spaces.management.viewSpaceFeatures.manageRolesLinkText"
                      defaultMessage="manage security roles"
                    />
                  </EuiLink>
                ) : (
                  <FormattedMessage
                    id="xpack.spaces.management.viewSpaceFeatures.manageRolesLinkText"
                    defaultMessage="manage security roles"
                  />
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <FeatureTable features={features} space={space} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
