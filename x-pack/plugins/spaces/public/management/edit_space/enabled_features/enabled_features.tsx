/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component, Fragment, ReactNode } from 'react';
import { ApplicationStart } from 'kibana/public';
import { Space } from '../../../../../../../src/plugins/spaces_oss/common';
import { KibanaFeatureConfig } from '../../../../../../plugins/features/public';
import { getEnabledFeatures } from '../../lib/feature_utils';
import { SectionPanel } from '../section_panel';
import { FeatureTable } from './feature_table';

interface Props {
  space: Partial<Space>;
  features: KibanaFeatureConfig[];
  securityEnabled: boolean;
  onChange: (space: Partial<Space>) => void;
  getUrlForApp: ApplicationStart['getUrlForApp'];
}

export class EnabledFeatures extends Component<Props, {}> {
  public render() {
    const description = i18n.translate(
      'xpack.spaces.management.manageSpacePage.customizeVisibleFeatures',
      {
        defaultMessage: 'Customize visible features',
      }
    );

    return (
      <SectionPanel
        title={this.getPanelTitle()}
        description={description}
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
            {this.getDescription()}
          </EuiFlexItem>
          <EuiFlexItem>
            <FeatureTable
              features={this.props.features}
              space={this.props.space}
              onChange={this.props.onChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SectionPanel>
    );
  }

  private getPanelTitle = () => {
    const featureCount = this.props.features.length;
    const enabledCount = getEnabledFeatures(this.props.features, this.props.space).length;

    let details: null | ReactNode = null;

    if (enabledCount === featureCount) {
      details = (
        <EuiText size={'s'} style={{ display: 'inline-block' }}>
          <em>
            <FormattedMessage
              id="xpack.spaces.management.enabledSpaceFeatures.allFeaturesEnabledMessage"
              defaultMessage="(all features visible)"
            />
          </em>
        </EuiText>
      );
    } else if (enabledCount === 0) {
      details = (
        <EuiText color="danger" size={'s'} style={{ display: 'inline-block' }}>
          <em>
            <FormattedMessage
              id="xpack.spaces.management.enabledSpaceFeatures.noFeaturesEnabledMessage"
              defaultMessage="(no features visible)"
            />
          </em>
        </EuiText>
      );
    } else {
      details = (
        <EuiText size={'s'} style={{ display: 'inline-block' }}>
          <em>
            <FormattedMessage
              id="xpack.spaces.management.enabledSpaceFeatures.someFeaturesEnabledMessage"
              defaultMessage="({enabledCount} / {featureCount} features visible)"
              values={{
                enabledCount,
                featureCount,
              }}
            />
          </em>
        </EuiText>
      );
    }

    return (
      <span>
        <FormattedMessage
          id="xpack.spaces.management.enabledSpaceFeatures.enabledFeaturesSectionMessage"
          defaultMessage="Features"
        />{' '}
        {details}
      </span>
    );
  };

  private getDescription = () => {
    return (
      <Fragment>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.spaces.management.enabledSpaceFeatures.notASecurityMechanismMessage"
              defaultMessage="The feature is hidden in the UI, but is not disabled."
            />
          </p>
          {this.props.securityEnabled && (
            <p>
              <FormattedMessage
                id="xpack.spaces.management.enabledSpaceFeatures.goToRolesLink"
                defaultMessage="If you wish to secure access to features, please {manageSecurityRoles}."
                values={{
                  manageSecurityRoles: (
                    <EuiLink
                      data-test-subj="goToRoles"
                      href={this.props.getUrlForApp('management', { path: 'security/roles' })}
                    >
                      <FormattedMessage
                        id="xpack.spaces.management.enabledSpaceFeatures.rolesLinkText"
                        defaultMessage="manage security roles"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          )}
        </EuiText>
      </Fragment>
    );
  };
}
