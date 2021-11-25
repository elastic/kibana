/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { LicensingLogic } from '../../../../../shared/licensing';
import { AppLogic } from '../../../../app_logic';
import { Features, FeatureIds } from '../../../../types';

import {
  INCLUDED_FEATURES_TITLE,
  SOURCE_FEATURES_SYNC_FREQUENCY_TITLE,
  SOURCE_FEATURES_SYNC_FREQUENCY_TIME,
  SOURCE_FEATURES_SYNCED_ITEMS_TITLE,
  SOURCE_FEATURES_SEARCHABLE_TITLE,
  SOURCE_FEATURES_SEARCHABLE_DESCRIPTION,
  SOURCE_FEATURES_REMOTE_FEATURE_TITLE,
  SOURCE_FEATURES_REMOTE_FEATURE_DESCRIPTION,
  SOURCE_FEATURES_PRIVATE_FEATURE_TITLE,
  SOURCE_FEATURES_PRIVATE_FEATURE_DESCRIPTION,
  SOURCE_FEATURES_GLOBAL_ACCESS_PERMISSIONS_FEATURE_TITLE,
  SOURCE_FEATURES_GLOBAL_ACCESS_PERMISSIONS_FEATURE_DESCRIPTION,
} from './constants';

interface ConnectInstanceProps {
  features?: Features;
  objTypes?: string[];
  name: string;
}

type IncludedFeatureIds = Exclude<FeatureIds, FeatureIds.DocumentLevelPermissions>;

export const SourceFeatures: React.FC<ConnectInstanceProps> = ({ features, objTypes, name }) => {
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { isOrganization } = useValues(AppLogic);

  const Feature = ({
    icon,
    title,
    children,
  }: {
    icon: string;
    title: string;
    children: React.ReactElement;
  }) => {
    return (
      <>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {icon && (
            <>
              <EuiFlexItem grow={false}>
                <EuiIcon size="m" type={icon} />
              </EuiFlexItem>
            </>
          )}
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{title}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="s">{children}</EuiText>
      </>
    );
  };

  const SyncFrequencyFeature = (
    <Feature icon="clock" title={SOURCE_FEATURES_SYNC_FREQUENCY_TITLE}>
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.workplaceSearch.contentSource.sourceFeatures.syncFrequency.text"
            defaultMessage="This source gets new content from {name} every {duration} (following the initial sync)."
            values={{
              name,
              duration: <strong>{SOURCE_FEATURES_SYNC_FREQUENCY_TIME}</strong>,
            }}
          />
        </p>
      </EuiText>
    </Feature>
  );

  const SyncedItemsFeature = (
    <Feature icon="documents" title={SOURCE_FEATURES_SYNCED_ITEMS_TITLE}>
      <>
        <EuiText size="s">
          <p>{SOURCE_FEATURES_SEARCHABLE_DESCRIPTION}</p>
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiText size="s">
          <ul>
            {objTypes!.map((objType, i) => (
              <li key={i}>{objType}</li>
            ))}
          </ul>
        </EuiText>
      </>
    </Feature>
  );

  const SearchableContentFeature = (
    <Feature icon="search" title={SOURCE_FEATURES_SEARCHABLE_TITLE}>
      <EuiText size="xs">
        <EuiText size="xs">
          <p>{SOURCE_FEATURES_SEARCHABLE_DESCRIPTION}</p>
        </EuiText>
        <EuiSpacer size="xs" />
        <ul>
          {objTypes!.map((objType, i) => (
            <li key={i}>{objType}</li>
          ))}
        </ul>
      </EuiText>
    </Feature>
  );

  const RemoteFeature = (
    <Feature icon="calendar" title={SOURCE_FEATURES_REMOTE_FEATURE_TITLE}>
      <EuiText size="xs">
        <p>{SOURCE_FEATURES_REMOTE_FEATURE_DESCRIPTION}</p>
      </EuiText>
    </Feature>
  );

  const PrivateFeature = (
    <Feature icon="lock" title={SOURCE_FEATURES_PRIVATE_FEATURE_TITLE}>
      <EuiText size="xs">
        <p>{SOURCE_FEATURES_PRIVATE_FEATURE_DESCRIPTION}</p>
      </EuiText>
    </Feature>
  );

  const GlobalAccessPermissionsFeature = (
    <Feature icon="globe" title={SOURCE_FEATURES_GLOBAL_ACCESS_PERMISSIONS_FEATURE_TITLE}>
      <EuiText size="xs">
        <p>{SOURCE_FEATURES_GLOBAL_ACCESS_PERMISSIONS_FEATURE_DESCRIPTION}</p>
      </EuiText>
    </Feature>
  );

  const FeaturesRouter = ({ featureId }: { featureId: IncludedFeatureIds }) =>
    ({
      [FeatureIds.SyncFrequency]: SyncFrequencyFeature,
      [FeatureIds.SearchableContent]: SearchableContentFeature,
      [FeatureIds.SyncedItems]: SyncedItemsFeature,
      [FeatureIds.Remote]: RemoteFeature,
      [FeatureIds.Private]: PrivateFeature,
      [FeatureIds.GlobalAccessPermissions]: GlobalAccessPermissionsFeature,
    }[featureId]);

  const IncludedFeatureIds = () => {
    let includedFeatures: FeatureIds[] | undefined;

    if (!hasPlatinumLicense && isOrganization) {
      includedFeatures = features?.basicOrgContext;
    }
    if (hasPlatinumLicense && isOrganization) {
      includedFeatures = features?.platinumOrgContext;
    }
    if (hasPlatinumLicense && !isOrganization) {
      includedFeatures = features?.platinumPrivateContext;
    }

    if (!includedFeatures?.length) {
      return null;
    }

    return (
      <>
        <EuiTitle size="s">
          <h2>{INCLUDED_FEATURES_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup>
          {includedFeatures.map((featureId, i) => (
            <EuiFlexItem key={i}>
              <EuiPanel hasShadow={false} paddingSize="l">
                <FeaturesRouter featureId={featureId as IncludedFeatureIds} />
              </EuiPanel>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </>
    );
  };

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      className="adding-a-source__features-list"
      responsive={false}
    >
      <EuiFlexItem>
        <IncludedFeatureIds />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
