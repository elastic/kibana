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
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { LicensingLogic } from '../../../../../../applications/shared/licensing';
import { AppLogic } from '../../../../app_logic';
import { LicenseBadge } from '../../../../components/shared/license_badge';
import { ENT_SEARCH_LICENSE_MANAGEMENT } from '../../../../routes';
import { Features, FeatureIds } from '../../../../types';

import {
  SOURCE_FEATURES_SEARCHABLE,
  SOURCE_FEATURES_REMOTE_FEATURE,
  SOURCE_FEATURES_PRIVATE_FEATURE,
  SOURCE_FEATURES_GLOBAL_ACCESS_PERMISSIONS_FEATURE,
  SOURCE_FEATURES_DOCUMENT_LEVEL_PERMISSIONS_FEATURE,
  SOURCE_FEATURES_EXPLORE_BUTTON,
  SOURCE_FEATURES_INCLUDED_FEATURES_TITLE,
} from './constants';

interface ConnectInstanceProps {
  features?: Features;
  objTypes?: string[];
  name: string;
}

export const SourceFeatures: React.FC<ConnectInstanceProps> = ({ features, objTypes, name }) => {
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { isOrganization } = useValues(AppLogic);

  const Feature = ({ title, children }: { title: string; children: React.ReactElement }) => (
    <>
      <EuiSpacer />
      <EuiText size="xs">
        <strong>{title}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      {children}
    </>
  );

  const SyncFrequencyFeature = (
    <Feature title="Syncs every 2 hours">
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
    <Feature title="Synced items">
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
    <Feature title="Searchable content">
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
    <Feature title="Always up-to-date">
      <EuiText size="xs">
        <p>{SOURCE_FEATURES_REMOTE_FEATURE}</p>
      </EuiText>
    </Feature>
  );

  const PrivateFeature = (
    <Feature title="Always private">
      <EuiText size="xs">
        <p>{SOURCE_FEATURES_PRIVATE_FEATURE}</p>
      </EuiText>
    </Feature>
  );

  const GlobalAccessPermissionsFeature = (
    <Feature title="Global access permissions">
      <EuiText size="xs">
        <p>{SOURCE_FEATURES_GLOBAL_ACCESS_PERMISSIONS_FEATURE}</p>
      </EuiText>
    </Feature>
  );

  const DocumentLevelPermissionsFeature = (
    <Feature title="Document-level permission synchronization">
      <EuiText size="xs">
        <p>{SOURCE_FEATURES_DOCUMENT_LEVEL_PERMISSIONS_FEATURE}</p>
        <EuiLink target="_blank" href={ENT_SEARCH_LICENSE_MANAGEMENT}>
          {SOURCE_FEATURES_EXPLORE_BUTTON}
        </EuiLink>
      </EuiText>
    </Feature>
  );

  const FeaturesRouter = ({ featureId }: { featureId: FeatureIds }) =>
    ({
      [FeatureIds.SyncFrequency]: SyncFrequencyFeature,
      [FeatureIds.SearchableContent]: SearchableContentFeature,
      [FeatureIds.SyncedItems]: SyncedItemsFeature,
      [FeatureIds.Remote]: RemoteFeature,
      [FeatureIds.Private]: PrivateFeature,
      [FeatureIds.GlobalAccessPermissions]: GlobalAccessPermissionsFeature,
      [FeatureIds.DocumentLevelPermissions]: DocumentLevelPermissionsFeature,
    }[featureId]);

  const IncludedFeatures = () => {
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
      <EuiPanel hasShadow={false} paddingSize="l" className="euiPanel--outline euiPanel--noShadow">
        <EuiTitle size="xs">
          <h4>{SOURCE_FEATURES_INCLUDED_FEATURES_TITLE}</h4>
        </EuiTitle>
        {includedFeatures.map((featureId, i) => (
          <FeaturesRouter key={i} featureId={featureId} />
        ))}
      </EuiPanel>
    );
  };

  const ExcludedFeatures = () => {
    let excludedFeatures: FeatureIds[] | undefined;

    if (!hasPlatinumLicense && isOrganization) {
      excludedFeatures = features?.basicOrgContextExcludedFeatures;
    }

    if (!excludedFeatures?.length) {
      return null;
    }

    return (
      <EuiPanel
        hasShadow={false}
        paddingSize="l"
        className="euiPanel--outlineSecondary euiPanel--noShadow"
      >
        <LicenseBadge />
        {excludedFeatures.map((featureId, i) => (
          <FeaturesRouter key={i} featureId={featureId} />
        ))}
      </EuiPanel>
    );
  };

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="l"
      className="adding-a-source__features-list"
      responsive={false}
    >
      <EuiFlexItem>
        <IncludedFeatures />
      </EuiFlexItem>

      <EuiFlexItem>
        <ExcludedFeatures />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
