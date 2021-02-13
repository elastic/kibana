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
import { FormattedMessage } from '@kbn/i18n/react';

import { LicensingLogic } from '../../../../../shared/licensing';
import { AppLogic } from '../../../../app_logic';
import { Features, FeatureIds } from '../../../../types';

import {
  SOURCE_FEATURES_SEARCHABLE,
  SOURCE_FEATURES_REMOTE_FEATURE,
  SOURCE_FEATURES_PRIVATE_FEATURE,
  SOURCE_FEATURES_GLOBAL_ACCESS_PERMISSIONS_FEATURE,
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
            <EuiText size="xs">
              <strong>{title}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="xs">{children}</EuiText>
      </>
    );
  };

  const SyncFrequencyFeature = (
    <Feature icon="clock" title="Syncs every 2 hours">
      <EuiText size="xs">
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.workplaceSearch.contentSource.sourceFeatures.syncFrequency.text"
            defaultMessage="This source gets new content from {name} every {duration} (following the initial sync)."
            values={{
              name,
              duration: <strong>2 hours</strong>,
            }}
          />
        </p>
      </EuiText>
    </Feature>
  );

  const SyncedItemsFeature = (
    <Feature icon="documents" title="Synced items">
      <>
        <EuiText size="xs">
          <p>{SOURCE_FEATURES_SEARCHABLE}</p>
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiText size="xs">
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
    <Feature icon="search" title="Searchable content">
      <EuiText size="xs">
        <EuiText size="xs">
          <p>{SOURCE_FEATURES_SEARCHABLE}</p>
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
    <Feature icon="calendar" title="Always up-to-date">
      <EuiText size="xs">
        <p>{SOURCE_FEATURES_REMOTE_FEATURE}</p>
      </EuiText>
    </Feature>
  );

  const PrivateFeature = (
    <Feature icon="lock" title="Always private">
      <EuiText size="xs">
        <p>{SOURCE_FEATURES_PRIVATE_FEATURE}</p>
      </EuiText>
    </Feature>
  );

  const GlobalAccessPermissionsFeature = (
    <Feature icon="globe" title="Global access permissions">
      <EuiText size="xs">
        <p>{SOURCE_FEATURES_GLOBAL_ACCESS_PERMISSIONS_FEATURE}</p>
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
        <EuiTitle size="xs">
          <h3>
            <strong>Included features</strong>
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup>
          {includedFeatures.map((featureId, i) => (
            <EuiFlexItem key={i}>
              <EuiPanel className="euiPanel--inset" paddingSize="l">
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
