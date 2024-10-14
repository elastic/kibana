/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiConfirmModal,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPageHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiCallOut,
  EuiCode,
  EuiSwitch,
  EuiHealth,
  EuiButton,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useEntityEngineStatus } from '../components/entity_store/hooks/use_entity_engine_status';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { ASSET_CRITICALITY_INDEX_PATTERN } from '../../../common/entity_analytics/asset_criticality';
import { useUiSetting$, useKibana } from '../../common/lib/kibana';
import { ENABLE_ASSET_CRITICALITY_SETTING } from '../../../common/constants';
import { AssetCriticalityFileUploader } from '../components/asset_criticality_file_uploader/asset_criticality_file_uploader';
import { useAssetCriticalityPrivileges } from '../components/asset_criticality/use_asset_criticality';
import { useHasSecurityCapability } from '../../helper_hooks';
import {
  useDeleteEntityEngineMutation,
  useInitEntityEngineMutation,
  useStopEntityEngineMutation,
} from '../components/entity_store/hooks/use_entity_store';

export const EntityStoreManagementPage = () => {
  const { docLinks } = useKibana().services;
  const entityAnalyticsLinks = docLinks.links.securitySolution.entityAnalytics;
  const hasEntityAnalyticsCapability = useHasSecurityCapability('entity-analytics');
  const isEntityStoreFeatureFlagEnabled = useIsExperimentalFeatureEnabled('entityStoreEnabled');
  const [isAssetCriticalityEnabled] = useUiSetting$<boolean>(ENABLE_ASSET_CRITICALITY_SETTING);
  const {
    data: assetCriticalityPrivileges,
    error: assetCriticalityPrivilegesError,
    isLoading: assetCriticalityIsLoading,
  } = useAssetCriticalityPrivileges('AssetCriticalityUploadPage');
  const hasAssetCriticalityWritePermissions = assetCriticalityPrivileges?.has_write_permissions;

  const [polling, setPolling] = useState(false);
  const entityStoreStatus = useEntityEngineStatus({
    disabled: false,
    polling: !polling
      ? undefined
      : (data) => {
          const shouldStopPolling =
            data?.engines &&
            data.engines.length > 0 &&
            data.engines.every((engine) => engine.status === 'started');

          if (shouldStopPolling) {
            setPolling(false);
            return false;
          }
          return 1000;
        },
  });
  const initEntityEngineMutation = useInitEntityEngineMutation();
  const stopEntityEngineMutation = useStopEntityEngineMutation();
  const deleteEntityEngineMutation = useDeleteEntityEngineMutation();

  const [isClearModalVisible, setIsClearModalVisible] = useState(false);

  const closeClearModal = () => setIsClearModalVisible(false);
  const showClearModal = () => setIsClearModalVisible(true);

  if (assetCriticalityIsLoading) {
    // Wait for permission before rendering content to avoid flickering
    return null;
  }

  const InsufficientAssetCriticalityPrivilegesCallout: React.FC = () => {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.noPermissionTitle"
            defaultMessage="Insufficient index privileges to perform CSV upload"
          />
        }
        color="primary"
        iconType="iInCircle"
      >
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.missingPermissionsCallout.description"
            defaultMessage="Write permission is required for the {index} index pattern in order to access this functionality. Contact your administrator for further assistance."
            values={{
              index: <EuiCode>{ASSET_CRITICALITY_INDEX_PATTERN}</EuiCode>,
            }}
          />
        </EuiText>
      </EuiCallOut>
    );
  };

  const AssetCriticalityIssueCallout: React.FC = () => {
    const errorMessage = assetCriticalityPrivilegesError?.body.message ?? (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.advancedSettingDisabledMessage"
        defaultMessage='Please enable "{ENABLE_ASSET_CRITICALITY_SETTING}" in advanced settings to access this functionality.'
        values={{
          ENABLE_ASSET_CRITICALITY_SETTING,
        }}
      />
    );

    return (
      <EuiFlexItem grow={false}>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.unavailable"
              defaultMessage="Asset criticality CSV file upload functionality unavailable."
            />
          }
          color="primary"
          iconType="iInCircle"
        >
          <EuiText size="s">{errorMessage}</EuiText>
        </EuiCallOut>
      </EuiFlexItem>
    );
  };

  const EntityStoreFeatureFlagNotAvailableCallout: React.FC = () => {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.featureFlagDisabled"
              defaultMessage="Entity Store capabilities not available"
            />
          }
          color="primary"
          iconType="iInCircle"
        >
          <EuiText size="s">
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.entityStoreManagementPage.featureFlagDisabledDescription"
              defaultMessage="The full capabilities of the Entity Store have been disabled in this environment. Contact your administrator for further assistance."
            />
          </EuiText>
        </EuiCallOut>
      </>
    );
  };

  const EntityStoreHealth: React.FC<{ currentEntityStoreStatus: string }> = ({
    currentEntityStoreStatus,
  }) => {
    return (
      <EuiHealth
        textSize="m"
        color={
          entityStoreEnabledStatuses.includes(currentEntityStoreStatus) ? 'success' : 'subdued'
        }
      >
        {entityStoreEnabledStatuses.includes(currentEntityStoreStatus) ? 'On' : 'Off'}
      </EuiHealth>
    );
  };

  const ClearEntityDataPanel: React.FC = () => {
    return (
      <>
        <EuiPanel
          paddingSize="l"
          grow={false}
          color="subdued"
          borderRadius="none"
          hasShadow={false}
        >
          <EuiText size={'s'}>
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.clearEntityData"
                defaultMessage="Clear entity data"
              />
            </h3>
            <EuiSpacer size="s" />
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.clearEntityData"
              defaultMessage={`Remove all extracted entity data from the store. This action will
            permanently delete persisted user and host records, and data will no longer be available for analysis.
            Proceed with caution, as this cannot be undone. Note that this operation will not delete source data,
            Entity risk scores, or Asset Criticality assignments.`}
            />
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton
            color="danger"
            iconType="trash"
            onClick={() => {
              showClearModal();
            }}
          >
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.clear"
              defaultMessage={'Clear'}
            />
          </EuiButton>
        </EuiPanel>
        {isClearModalVisible && (
          <EuiConfirmModal
            title="Clear Entity data?"
            onCancel={closeClearModal}
            onConfirm={() => {
              closeClearModal();
              deleteEntityEngineMutation.mutate();
            }}
            cancelButtonText="Keep Entities"
            confirmButtonText="Clear All Entities"
            buttonColor="danger"
            defaultFocusedButton="confirm"
          >
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.clearConfirmation"
              defaultMessage={
                'This will delete all Security Entity store records. Source data, Entity risk scores, and Asset' +
                'criticality assignments are unaffected by this action. This operation cannot be undone.'
              }
            />
          </EuiConfirmModal>
        )}
      </>
    );
  };

  const WhatIsAssetCriticalityPanel: React.FC = () => {
    return (
      <EuiPanel hasBorder={true} paddingSize="l" grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiIcon type="questionInCircle" size="xl" />
          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.information.title"
                defaultMessage="What is asset criticality?"
              />
            </h3>
          </EuiTitle>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.information.description"
            defaultMessage="Asset criticality allows you to classify entities based on their importance and impact on business operations. Use asset criticality to guide prioritization for alert triaging, threat-hunting, and investigation activities."
          />
        </EuiText>
        <EuiHorizontalRule />
        <EuiTitle size="xxs">
          <h4>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.information.usefulLinks"
              defaultMessage="Useful links"
            />
          </h4>
        </EuiTitle>
        <EuiSpacer size="xs" />

        <EuiLink
          target="_blank"
          rel="noopener nofollow noreferrer"
          href={entityAnalyticsLinks.assetCriticality}
        >
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.documentationLink"
            defaultMessage="Asset criticality documentation"
          />
        </EuiLink>
      </EuiPanel>
    );
  };

  const FileUploadSection = () => {
    if (
      !hasEntityAnalyticsCapability ||
      !isAssetCriticalityEnabled ||
      assetCriticalityPrivilegesError?.body.status_code === 403
    ) {
      return <AssetCriticalityIssueCallout />;
    }
    if (!hasAssetCriticalityWritePermissions) {
      return <InsufficientAssetCriticalityPrivilegesCallout />;
    }
    return (
      <EuiFlexItem grow={3}>
        <EuiTitle size="s">
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.subTitle"
              defaultMessage="Upload entities using CSV file upload"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.description"
            defaultMessage="Bulk assign asset criticality by importing a CSV, TXT, or TSV file exported from your asset management tools. This ensures data accuracy and reduces manual input errors."
          />
        </EuiText>
        <EuiSpacer size="s" />
        <AssetCriticalityFileUploader />
      </EuiFlexItem>
    );
  };

  const entityStoreEnabledStatuses = ['enabled'];
  const switchDisabledStatuses = ['error', 'loading', 'installing'];
  const entityStoreInstallingStatuses = ['installing', 'loading'];
  const canDeleteEntityEngine = !['not_installed', 'loading', 'installing'].includes(
    entityStoreStatus.status
  );

  const onSwitchClick = () => {
    if (switchDisabledStatuses.includes(entityStoreStatus.status)) {
      return;
    }

    if (entityStoreEnabledStatuses.includes(entityStoreStatus.status)) {
      stopEntityEngineMutation.mutate();
    } else {
      setPolling(true);
      initEntityEngineMutation.mutate();
    }
  };

  const EnablementButton = () => {
    return (
      <EuiFlexGroup alignItems={'center'}>
        {(initEntityEngineMutation.isLoading ||
          stopEntityEngineMutation.isLoading ||
          deleteEntityEngineMutation.isLoading ||
          entityStoreInstallingStatuses.includes(entityStoreStatus.status)) && (
          <EuiFlexItem>
            <EuiLoadingSpinner data-test-subj="entity-store-status-loading" size="m" />
          </EuiFlexItem>
        )}
        <EntityStoreHealth currentEntityStoreStatus={entityStoreStatus.status} />
        <EuiSwitch
          showLabel={false}
          label={''}
          onChange={onSwitchClick}
          data-test-subj="entity-store-switch"
          checked={entityStoreEnabledStatuses.includes(entityStoreStatus.status)}
          disabled={
            initEntityEngineMutation.isLoading ||
            stopEntityEngineMutation.isLoading ||
            deleteEntityEngineMutation.isLoading ||
            switchDisabledStatuses.includes(entityStoreStatus.status)
          }
          aria-describedby={'switchEntityStore'}
        />
      </EuiFlexGroup>
    );
  };

  return (
    <>
      <EuiPageHeader
        data-test-subj="entityStoreManagementPage"
        pageTitle={
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.title"
            defaultMessage="Entity Store"
          />
        }
        alignItems="center"
        rightSideItems={isEntityStoreFeatureFlagEnabled ? [<EnablementButton />] : []}
      />
      <EuiSpacer size="s" />
      <EuiText>
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.subTitle"
          defaultMessage="Allows comprehensive monitoring of your system's hosts and users."
        />
      </EuiText>
      {!isEntityStoreFeatureFlagEnabled && <EntityStoreFeatureFlagNotAvailableCallout />}
      <EuiHorizontalRule />
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="xl">
        <FileUploadSection />
        <EuiFlexItem grow={2}>
          <EuiFlexGroup direction="column">
            <WhatIsAssetCriticalityPanel />
            {isEntityStoreFeatureFlagEnabled && canDeleteEntityEngine && <ClearEntityDataPanel />}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

EntityStoreManagementPage.displayName = 'EntityStoreManagementPage';
