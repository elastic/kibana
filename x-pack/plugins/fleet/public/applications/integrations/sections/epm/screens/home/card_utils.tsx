/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage, FormattedDate, FormattedTime } from '@kbn/i18n-react';
import { EuiBadge, EuiFlexItem, EuiSpacer, EuiToolTip } from '@elastic/eui';
import semverLt from 'semver/functions/lt';

import type {
  CustomIntegration,
  CustomIntegrationIcon,
} from '@kbn/custom-integrations-plugin/common';

import { hasDeferredInstallations } from '../../../../../../services/has_deferred_installations';
import { getPackageReleaseLabel } from '../../../../../../../common/services';

import { installationStatuses } from '../../../../../../../common/constants';
import type {
  InstallFailedAttempt,
  IntegrationCardReleaseLabel,
  PackageSpecIcon,
} from '../../../../../../../common/types';

import type { DynamicPage, DynamicPagePathValues, StaticPage } from '../../../../constants';
import { isPackageUnverified, isPackageUpdatable } from '../../../../services';

import type { PackageListItem } from '../../../../types';

export interface IntegrationCardItem {
  url: string;
  release?: IntegrationCardReleaseLabel;
  description: string;
  name: string;
  title: string;
  version: string;
  icons: Array<PackageSpecIcon | CustomIntegrationIcon>;
  integration: string;
  id: string;
  categories: string[];
  fromIntegrations?: string;
  isReauthorizationRequired?: boolean;
  isUnverified?: boolean;
  isUpdateAvailable?: boolean;
  isQuickstart?: boolean;
  showLabels?: boolean;
  extraLabelsBadges?: React.ReactNode[];
  onCardClick?: () => void;
}

export const mapToCard = ({
  getAbsolutePath,
  getHref,
  item,
  addBasePath,
  packageVerificationKeyId,
  selectedCategory,
}: {
  getAbsolutePath: (p: string) => string;
  getHref: (page: StaticPage | DynamicPage, values?: DynamicPagePathValues) => string;
  addBasePath: (url: string) => string;
  item: CustomIntegration | PackageListItem;
  packageVerificationKeyId?: string;
  selectedCategory?: string;
}): IntegrationCardItem => {
  let uiInternalPathUrl: string;

  let isUnverified = false;

  let version = 'version' in item ? item.version || '' : '';

  let isUpdateAvailable = false;
  let isReauthorizationRequired = false;
  if (item.type === 'ui_link') {
    uiInternalPathUrl = item.id.includes('language_client.')
      ? addBasePath(item.uiInternalPath)
      : item.uiExternalLink || getAbsolutePath(item.uiInternalPath);
  } else {
    if (item?.installationInfo?.version) {
      version = item.installationInfo.version || item.version;
      isUnverified = isPackageUnverified(item, packageVerificationKeyId);
      isUpdateAvailable = isPackageUpdatable(item);

      isReauthorizationRequired = hasDeferredInstallations(item);
    }

    const url = getHref('integration_details_overview', {
      pkgkey: `${item.name}-${version}`,
      ...(item.integration ? { integration: item.integration } : {}),
    });

    uiInternalPathUrl = url;
  }

  const release: IntegrationCardReleaseLabel = getPackageReleaseLabel(version);

  let extraLabelsBadges: React.ReactNode[] | undefined;
  if (item.type === 'integration') {
    extraLabelsBadges = getIntegrationLabels(item);
  }

  return {
    id: `${item.type === 'ui_link' ? 'ui_link' : 'epr'}:${item.id}`,
    description: item.description,
    icons: !item.icons || !item.icons.length ? [] : item.icons,
    title: item.title,
    url: uiInternalPathUrl,
    fromIntegrations: selectedCategory,
    integration: 'integration' in item ? item.integration || '' : '',
    name: 'name' in item ? item.name : item.id,
    version,
    release,
    categories: ((item.categories || []) as string[]).filter((c: string) => !!c),
    isReauthorizationRequired,
    isUnverified,
    isUpdateAvailable,
    extraLabelsBadges,
  };
};

export function getIntegrationLabels(item: PackageListItem): React.ReactNode[] {
  const extraLabelsBadges: React.ReactNode[] = [];

  if (
    item?.installationInfo?.latest_install_failed_attempts?.some(
      (attempt) =>
        item.installationInfo && semverLt(item.installationInfo.version, attempt.target_version)
    )
  ) {
    const updateFailedAttempt = item.installationInfo?.latest_install_failed_attempts?.find(
      (attempt) =>
        item.installationInfo && semverLt(item.installationInfo.version, attempt.target_version)
    );
    extraLabelsBadges.push(
      <EuiFlexItem key="update_failed_badge" grow={false}>
        <EuiSpacer size="xs" />
        <span>
          <EuiToolTip
            title={
              <FormattedMessage
                id="xpack.fleet.packageCard.updateFailedTooltipTitle"
                defaultMessage="Update failed"
              />
            }
            content={updateFailedAttempt ? formatAttempt(updateFailedAttempt) : undefined}
          >
            <EuiBadge color="danger" iconType="error">
              <FormattedMessage
                id="xpack.fleet.packageCard.updateFailed"
                defaultMessage="Update failed"
              />
            </EuiBadge>
          </EuiToolTip>
        </span>
      </EuiFlexItem>
    );
  }

  if (item.installationInfo?.install_status === installationStatuses.InstallFailed) {
    const installFailedAttempt = item.installationInfo?.latest_install_failed_attempts?.find(
      (attempt) => attempt.target_version === item.installationInfo?.version
    );

    extraLabelsBadges.push(
      <EuiFlexItem key="install_failed_badge" grow={false}>
        <EuiSpacer size="xs" />
        <span>
          <EuiToolTip
            title={
              <FormattedMessage
                id="xpack.fleet.packageCard.installFailedTooltipTitle"
                defaultMessage="Install failed"
              />
            }
            content={installFailedAttempt ? formatAttempt(installFailedAttempt) : undefined}
          >
            <EuiBadge color="danger" iconType="error">
              <FormattedMessage
                id="xpack.fleet.packageCard.installFailed"
                defaultMessage="Install failed"
              />
            </EuiBadge>
          </EuiToolTip>
        </span>
      </EuiFlexItem>
    );
  }

  return extraLabelsBadges;
}

function formatAttempt(attempt: InstallFailedAttempt): React.ReactNode {
  return (
    <>
      <FormattedMessage
        id="xpack.fleet.packageCard.faileAttemptDescription"
        defaultMessage="Failed at {attemptDate}."
        values={{
          attemptDate: (
            <>
              <FormattedDate
                value={attempt.created_at}
                year="numeric"
                month="short"
                day="numeric"
              />
              <> @ </>
              <FormattedTime
                value={attempt.created_at}
                hour="numeric"
                minute="numeric"
                second="numeric"
              />
            </>
          ),
        }}
      />
      <p>
        {attempt.error?.name || ''} : {attempt.error?.message || ''}
      </p>
    </>
  );
}
