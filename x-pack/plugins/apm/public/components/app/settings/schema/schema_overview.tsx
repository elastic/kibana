/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import semverLt from 'semver/functions/lt';
import { PackagePolicy } from '@kbn/fleet-plugin/common/types';
import rocketLaunchGraphic from './blog_rocket_720x420.png';
import { MigrationInProgressPanel } from './migration_in_progress_panel';
import { UpgradeAvailableCard } from './migrated/upgrade_available_card';
import { SuccessfulMigrationCard } from './migrated/successful_migration_card';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

interface Props {
  onSwitch: () => void;
  isMigrating: boolean;
  isMigrated: boolean;
  isLoading: boolean;
  isLoadingConfirmation: boolean;
  cloudApmMigrationEnabled: boolean;
  hasCloudAgentPolicy: boolean;
  hasRequiredRole: boolean;
  cloudApmPackagePolicy: PackagePolicy | undefined;
  latestApmPackageVersion: string;
}
export function SchemaOverview({
  onSwitch,
  isMigrating,
  isMigrated,
  isLoading,
  isLoadingConfirmation,
  cloudApmMigrationEnabled,
  hasCloudAgentPolicy,
  hasRequiredRole,
  cloudApmPackagePolicy,
  latestApmPackageVersion,
}: Props) {
  const isDisabled =
    !cloudApmMigrationEnabled || !hasCloudAgentPolicy || !hasRequiredRole;
  const packageVersion = cloudApmPackagePolicy?.package?.version;
  const isUpgradeAvailable =
    packageVersion && semverLt(packageVersion, latestApmPackageVersion);

  if (isLoading) {
    return (
      <>
        <SchemaOverviewHeading />
        <EuiFlexGroup justifyContent="center">
          <EuiLoadingSpinner size="xl" />
        </EuiFlexGroup>
      </>
    );
  }

  if (isMigrating && !isMigrated) {
    return (
      <>
        <SchemaOverviewHeading />
        <MigrationInProgressPanel />
      </>
    );
  }

  if (isMigrated) {
    return (
      <>
        <SchemaOverviewHeading />
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem />
          <EuiFlexItem grow={2}>
            {isUpgradeAvailable ? (
              <UpgradeAvailableCard
                apmPackagePolicyId={cloudApmPackagePolicy?.id}
              />
            ) : (
              <SuccessfulMigrationCard />
            )}
          </EuiFlexItem>
          <EuiFlexItem />
        </EuiFlexGroup>
      </>
    );
  }

  return (
    <>
      <SchemaOverviewHeading />
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem />
        <EuiFlexItem style={{ minWidth: '250px' }}>
          <EuiCard
            icon={<EuiIcon size="xxl" type="node" />}
            title={i18n.translate(
              'xpack.apm.settings.schema.migrate.classicIndices.title',
              { defaultMessage: 'APM Server binary' }
            )}
            display="subdued"
            description={i18n.translate(
              'xpack.apm.settings.schema.migrate.classicIndices.description',
              {
                defaultMessage:
                  'You are currently using APM Server binary. This legacy option is deprecated since version 7.16 and is being replaced by a managed APM Server in Elastic Agent from version 8.0.',
              }
            )}
            footer={
              <div>
                <EuiText size="s" color="subdued">
                  <p>
                    {i18n.translate(
                      'xpack.apm.settings.schema.migrate.classicIndices.currentSetup',
                      { defaultMessage: 'Current setup' }
                    )}
                  </p>
                </EuiText>
              </div>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: '250px' }}>
          <EuiCard
            image={
              <div>
                <img src={rocketLaunchGraphic} alt="rocket launch" />
              </div>
            }
            title={i18n.translate(
              'xpack.apm.settings.schema.migrate.dataStreams.title',
              { defaultMessage: 'Elastic Agent' }
            )}
            description={i18n.translate(
              'xpack.apm.settings.schema.migrate.dataStreams.description',
              {
                defaultMessage:
                  'Starting in version 8.0, APM Server is recommended to be managed by Elastic Agent. Elastic Agent can run on our hosted Elasticsearch Service, ECE, or be self-managed. Then, add the Elastic APM integration to continue ingesting APM data.',
              }
            )}
            footer={
              <div>
                <EuiToolTip
                  position="bottom"
                  content={getDisabledReason({
                    cloudApmMigrationEnabled,
                    hasCloudAgentPolicy,
                    hasRequiredRole,
                  })}
                >
                  <EuiButton
                    fill
                    isLoading={isLoadingConfirmation}
                    isDisabled={isDisabled}
                  >
                    {i18n.translate(
                      'xpack.apm.settings.schema.migrate.dataStreams.buttonText',
                      { defaultMessage: 'Switch to Elastic Agent' }
                    )}
                  </EuiButton>
                </EuiToolTip>
              </div>
            }
            onClick={onSwitch}
            isDisabled={isDisabled}
          />
        </EuiFlexItem>
        <EuiFlexItem />
      </EuiFlexGroup>
    </>
  );
}

export function SchemaOverviewHeading() {
  const { docLinks } = useApmPluginContext().core;
  return (
    <>
      <EuiText color="subdued">
        <FormattedMessage
          id="xpack.apm.settings.schema.descriptionText"
          defaultMessage="We have created a simple and seamless process for switching from APM Server binary to Elastic Agent. Beware this action is {irreversibleEmphasis} and can only be performed by a {superuserEmphasis} with access to Fleet. Learn more about {elasticAgentDocLink}."
          values={{
            irreversibleEmphasis: (
              <strong>
                {i18n.translate(
                  'xpack.apm.settings.schema.descriptionText.irreversibleEmphasisText',
                  { defaultMessage: 'irreversible' }
                )}
              </strong>
            ),
            superuserEmphasis: (
              <strong>
                {i18n.translate(
                  'xpack.apm.settings.schema.descriptionText.superuserEmphasisText',
                  { defaultMessage: 'superuser' }
                )}
              </strong>
            ),
            elasticAgentDocLink: (
              <EuiLink target="_blank" href={docLinks.links.apm.elasticAgent}>
                {i18n.translate(
                  'xpack.apm.settings.schema.descriptionText.elasticAgentDocLinkText',
                  { defaultMessage: 'Elastic Agent' }
                )}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer size="m" />
    </>
  );
}

function getDisabledReason({
  cloudApmMigrationEnabled,
  hasCloudAgentPolicy,
  hasRequiredRole,
}: {
  cloudApmMigrationEnabled: boolean;
  hasCloudAgentPolicy: boolean;
  hasRequiredRole: boolean;
}) {
  const reasons: string[] = [];
  if (!cloudApmMigrationEnabled) {
    reasons.push(
      i18n.translate(
        'xpack.apm.settings.schema.disabledReason.cloudApmMigrationEnabled',
        { defaultMessage: 'Cloud migration is not enabled' }
      )
    );
  }
  if (!hasCloudAgentPolicy) {
    reasons.push(
      i18n.translate(
        'xpack.apm.settings.schema.disabledReason.hasCloudAgentPolicy',
        { defaultMessage: 'Cloud agent policy does not exist' }
      )
    );
  }
  if (!hasRequiredRole) {
    reasons.push(
      i18n.translate(
        'xpack.apm.settings.schema.disabledReason.hasRequiredRole',
        { defaultMessage: 'User does not have superuser role' }
      )
    );
  }
  if (reasons.length) {
    return (
      <FormattedMessage
        id="xpack.apm.settings.schema.disabledReason"
        defaultMessage="Switch to Elastic Agent is unavailable: {reasons}"
        values={{
          reasons: (
            <ul>
              {reasons.map((reasonText, index) => (
                <li key={index}>- {reasonText}</li>
              ))}
            </ul>
          ),
        }}
      />
    );
  }
}
