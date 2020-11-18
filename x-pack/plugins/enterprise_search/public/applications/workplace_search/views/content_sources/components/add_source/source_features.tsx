/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

import { AppLogic } from '../../../../app_logic';
import { LicenseBadge } from '../../../../components/shared/license_badge';
import { Features, FeatureIds } from '../../../../types';
import { ENT_SEARCH_LICENSE_MANAGEMENT } from '../../../../routes';

interface ConnectInstanceProps {
  features?: Features;
  objTypes?: string[];
  name: string;
}

export const SourceFeatures: React.FC<ConnectInstanceProps> = ({ features, objTypes, name }) => {
  const {
    isOrganization,
    fpAccount: { minimumPlatinumLicense },
  } = useValues(AppLogic);

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
          This source gets new content from {name} every <strong>2 hours</strong> (following the
          initial&nbsp;sync).
        </p>
      </EuiText>
    </Feature>
  );

  const SyncedItemsFeature = (
    <Feature title="Synced items">
      <>
        <EuiText size="xs">
          <p>The following items are searchable:</p>
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
          <p>The following items are searchable:</p>
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
        <p>
          Message data and other information is searchable in real-time from the Workplace Search
          experience.
        </p>
      </EuiText>
    </Feature>
  );

  const PrivateFeature = (
    <Feature title="Always private">
      <EuiText size="xs">
        <p>
          Results returned are specific and relevant to you. Connecting this source does not expose
          your personal data to other search users - only you.
        </p>
      </EuiText>
    </Feature>
  );

  const GlobalAccessPermissionsFeature = (
    <Feature title="Global access permissions">
      <EuiText size="xs">
        <p>
          All documents accessible to the connecting service user will be synchronized and made
          available to the organization’s users, or group’s users. Documents are immediately
          available for search
        </p>
      </EuiText>
    </Feature>
  );

  const DocumentLevelPermissionsFeature = (
    <Feature title="Document-level permission synchronization">
      <EuiText size="xs">
        <p>
          Document-level permissions manage user content access based on defined rules. Allow or
          deny access to certain documents for individuals and groups.
        </p>
        <EuiLink target="_blank" href={ENT_SEARCH_LICENSE_MANAGEMENT}>
          Explore Platinum features
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

    if (!minimumPlatinumLicense && isOrganization) {
      includedFeatures = features?.basicOrgContext;
    }
    if (minimumPlatinumLicense && isOrganization) {
      includedFeatures = features?.platinumOrgContext;
    }
    if (minimumPlatinumLicense && !isOrganization) {
      includedFeatures = features?.platinumPrivateContext;
    }

    if (!includedFeatures?.length) {
      return null;
    }

    return (
      <EuiPanel hasShadow={false} paddingSize="l" className="euiPanel--outline euiPanel--noShadow">
        <EuiTitle size="xs">
          <h4>Included features</h4>
        </EuiTitle>
        {includedFeatures.map((featureId, i) => (
          <FeaturesRouter key={i} featureId={featureId} />
        ))}
      </EuiPanel>
    );
  };

  const ExcludedFeatures = () => {
    let excludedFeatures: FeatureIds[] | undefined;

    if (!minimumPlatinumLicense && isOrganization) {
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
