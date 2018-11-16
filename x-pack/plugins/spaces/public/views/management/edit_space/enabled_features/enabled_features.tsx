/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n/react';
import React, { Component, Fragment, ReactNode } from 'react';
import { Space } from 'x-pack/plugins/spaces/common/model/space';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { CollapsiblePanel } from 'x-pack/public/components';
import { FeatureTable } from './feature_table';

interface Props {
  space: Partial<Space>;
  features: Feature[];
  intl: InjectedIntl;
  onChange: (space: Partial<Space>) => void;
}

export class EnabledFeatures extends Component<Props, {}> {
  public render() {
    return (
      <CollapsiblePanel initiallyCollapsed title={this.getPanelTitle()}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.spaces.management.enabledSpaceFeatures.enableFeaturesInSpaceMessage"
                  defaultMessage="Enable features within this space"
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
              intl={this.props.intl}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </CollapsiblePanel>
    );
  }

  private getPanelTitle = () => {
    const featureCount = this.props.features.length;
    const disabledCount = this.getKnownDisabledFeatures().length;

    const enabledCount = featureCount - disabledCount;

    let details: null | ReactNode = null;

    if (disabledCount === 0) {
      details = (
        <EuiText size={'s'} style={{ display: 'inline-block' }}>
          <em>
            <FormattedMessage
              id="xpack.spaces.management.enabledSpaceFeatures.allFeaturesEnabledMessage"
              defaultMessage="(all features enabled)"
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
              defaultMessage="(no features enabled)"
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
              defaultMessage="({enabledCount} / {featureCount} feature enabled"
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
          defaultMessage="Enabled features"
        />{' '}
        {details}
      </span>
    );
  };

  private getKnownDisabledFeatures = () => {
    return (this.props.space.disabledFeatures || []).filter(id =>
      this.props.features.find(({ id: featureId }) => featureId === id)
    );
  };

  private getDescription = () => {
    const featureCount = this.props.features.length;
    const disabledCount = this.getKnownDisabledFeatures().length;
    const enabledCount = featureCount - disabledCount;

    return (
      <Fragment>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.spaces.management.enabledSpaceFeatures.chooseEnabledFeaturesMessage"
              defaultMessage="Choose which features are enabled within this space."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.spaces.management.enabledSpaceFeatures.notASecurityMechanismMessage"
              defaultMessage="Note: this is not a security mechanism"
            />
          </p>
        </EuiText>
        {enabledCount === 0 && (
          <Fragment>
            <EuiSpacer />
            <EuiCallOut
              color="danger"
              title={this.props.intl.formatMessage({
                id: 'xpack.spaces.management.enabledSpaceFeatures.enableAtLeastOneFeatureMessage',
                defaultMessage: 'At least one feature must be enabled',
              })}
              iconType="alert"
              size="s"
            />
          </Fragment>
        )}
      </Fragment>
    );
  };
}
