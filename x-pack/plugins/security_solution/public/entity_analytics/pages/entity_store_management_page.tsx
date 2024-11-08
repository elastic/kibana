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
  EuiToolTip,
  EuiBetaBadge,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useEntityEngineStatus } from '../components/entity_store/hooks/use_entity_engine_status';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { ASSET_CRITICALITY_INDEX_PATTERN } from '../../../common/entity_analytics/asset_criticality';
import { useKibana } from '../../common/lib/kibana';
import { AssetCriticalityFileUploader } from '../components/asset_criticality_file_uploader/asset_criticality_file_uploader';
import { useAssetCriticalityPrivileges } from '../components/asset_criticality/use_asset_criticality';
import { useHasSecurityCapability } from '../../helper_hooks';
import {
  useDeleteEntityEngineMutation,
  useInitEntityEngineMutation,
  useStopEntityEngineMutation,
} from '../components/entity_store/hooks/use_entity_store';
import { TECHNICAL_PREVIEW, TECHNICAL_PREVIEW_TOOLTIP } from '../../common/translations';
import { useEntityEnginePrivileges } from '../components/entity_store/hooks/use_entity_engine_privileges';
import { MissingPrivilegesCallout } from '../components/entity_store/components/missing_privileges_callout';

const entityStoreEnabledStatuses = ['enabled'];
const switchDisabledStatuses = ['error', 'loading', 'installing'];
const entityStoreInstallingStatuses = ['installing', 'loading'];

export const EntityStoreManagementPage = () => {
  const hasEntityAnalyticsCapability = useHasSecurityCapability('entity-analytics');
  const isEntityStoreFeatureFlagDisabled = useIsExperimentalFeatureEnabled('entityStoreDisabled');
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
  const deleteEntityEngineMutation = useDeleteEntityEngineMutation({
    onSuccess: () => {
      closeClearModal();
    },
  });

  const [isClearModalVisible, setIsClearModalVisible] = useState(false);
  const closeClearModal = useCallback(() => setIsClearModalVisible(false), []);
  const showClearModal = useCallback(() => setIsClearModalVisible(true), []);

  const onSwitchClick = useCallback(() => {
    if (switchDisabledStatuses.includes(entityStoreStatus.status)) {
      return;
    }

    if (entityStoreEnabledStatuses.includes(entityStoreStatus.status)) {
      stopEntityEngineMutation.mutate();
    } else {
      setPolling(true);
      initEntityEngineMutation.mutate();
    }
  }, [initEntityEngineMutation, stopEntityEngineMutation, entityStoreStatus]);

  const { data: privileges } = useEntityEnginePrivileges();

  if (assetCriticalityIsLoading) {
    // Wait for permission before rendering content to avoid flickering
    return null;
  }

  const AssetCriticalityIssueCallout: React.FC = () => {
    const errorMessage = assetCriticalityPrivilegesError?.body.message ?? (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.advancedSettingDisabledMessage"
        defaultMessage="The don't have privileges to access Asset Criticality feature. Contact your administrator for further assistance."
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
          <EuiText size="s">
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
              defaultMessage="Clear"
            />
          </EuiButton>
        </EuiPanel>
        {isClearModalVisible && (
          <EuiConfirmModal
            isLoading={deleteEntityEngineMutation.isLoading}
            title={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.clearEntitiesModal.title"
                defaultMessage="Clear Entity data?"
              />
            }
            onCancel={closeClearModal}
            onConfirm={() => {
              deleteEntityEngineMutation.mutate();
            }}
            cancelButtonText={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.clearEntitiesModal.close"
                defaultMessage="Close"
              />
            }
            confirmButtonText={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.clearEntitiesModal.clearAllEntities"
                defaultMessage="Clear All Entities"
              />
            }
            buttonColor="danger"
            defaultFocusedButton="confirm"
          >
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.clearConfirmation"
              defaultMessage={
                'This will delete all Security Entity store records. Source data, Entity risk scores, and Asset criticality assignments are unaffected by this action. This operation cannot be undone.'
              }
            />
          </EuiConfirmModal>
        )}
      </>
    );
  };

  const FileUploadSection: React.FC = () => {
    if (
      !hasEntityAnalyticsCapability ||
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
              defaultMessage="Import entities using a text file"
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

  const canDeleteEntityEngine = !['not_installed', 'loading', 'installing'].includes(
    entityStoreStatus.status
  );

  const isMutationLoading =
    initEntityEngineMutation.isLoading ||
    stopEntityEngineMutation.isLoading ||
    deleteEntityEngineMutation.isLoading;

  const callouts = entityStoreStatus.errors.map((error) => (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.errors.title"
          defaultMessage={'An error occurred during entity store resource initialization'}
        />
      }
      color="danger"
      iconType="alert"
    >
      <p>{error.message}</p>
    </EuiCallOut>
  ));

  return (
    <>
      <EuiPageHeader
        data-test-subj="entityStoreManagementPage"
        pageTitle={
          <>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.title"
              defaultMessage="Entity Store"
            />{' '}
            <EuiToolTip content={TECHNICAL_PREVIEW_TOOLTIP}>
              <EuiBetaBadge label={TECHNICAL_PREVIEW} />
            </EuiToolTip>
          </>
        }
        alignItems="center"
        rightSideItems={
          !isEntityStoreFeatureFlagDisabled && privileges?.has_all_required
            ? [
                <EnablementButton
                  isLoading={
                    isMutationLoading ||
                    entityStoreInstallingStatuses.includes(entityStoreStatus.status)
                  }
                  isDisabled={
                    isMutationLoading || switchDisabledStatuses.includes(entityStoreStatus.status)
                  }
                  onSwitch={onSwitchClick}
                  status={entityStoreStatus.status}
                />,
              ]
            : []
        }
      />
      <EuiSpacer size="s" />
      <EuiText>
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.subTitle"
          defaultMessage="Store host and user entities observed in events."
        />
      </EuiText>
      {isEntityStoreFeatureFlagDisabled && <EntityStoreFeatureFlagNotAvailableCallout />}
      {!privileges || privileges.has_all_required ? null : (
        <>
          <EuiSpacer size="l" />
          <MissingPrivilegesCallout privileges={privileges} />
          <EuiSpacer size="l" />
        </>
      )}

      <EuiHorizontalRule />
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="xl">
        <FileUploadSection />
        <EuiFlexItem grow={2}>
          <EuiFlexGroup direction="column">
            {initEntityEngineMutation.isError && (
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.errors.initErrorTitle"
                    defaultMessage={'There was a problem initializing the entity store'}
                  />
                }
                color="danger"
                iconType="alert"
              >
                <p>
                  {(initEntityEngineMutation.error as { body: { message: string } }).body.message}
                </p>
              </EuiCallOut>
            )}
            {deleteEntityEngineMutation.isError && (
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.entityStoreManagementPage.errors.deleteErrorTitle"
                    defaultMessage={'There was a problem deleting the entity store'}
                  />
                }
                color="danger"
                iconType="alert"
              >
                <p>
                  {(deleteEntityEngineMutation.error as { body: { message: string } }).body.message}
                </p>
              </EuiCallOut>
            )}
            {callouts}
            <WhatIsAssetCriticalityPanel />
            {!isEntityStoreFeatureFlagDisabled &&
              privileges?.has_all_required &&
              canDeleteEntityEngine && <ClearEntityDataPanel />}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

EntityStoreManagementPage.displayName = 'EntityStoreManagementPage';

const WhatIsAssetCriticalityPanel: React.FC = () => {
  const { docLinks } = useKibana().services;
  const entityAnalyticsLinks = docLinks.links.securitySolution.entityAnalytics;

  return (
    <EuiPanel hasBorder={true} paddingSize="l" grow={false}>
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.information.intro"
        defaultMessage="As part of importing entities using a text file, you are also able to set Asset Criticality for the imported Entities."
      />
      <EuiSpacer size="l" />
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
      color={entityStoreEnabledStatuses.includes(currentEntityStoreStatus) ? 'success' : 'subdued'}
    >
      {entityStoreEnabledStatuses.includes(currentEntityStoreStatus) ? 'On' : 'Off'}
    </EuiHealth>
  );
};

const EnablementButton: React.FC<{
  isLoading: boolean;
  isDisabled: boolean;
  status: string;
  onSwitch: () => void;
}> = ({ isLoading, isDisabled, status, onSwitch }) => {
  return (
    <EuiFlexGroup alignItems="center">
      {isLoading && (
        <EuiFlexItem>
          <EuiLoadingSpinner data-test-subj="entity-store-status-loading" size="m" />
        </EuiFlexItem>
      )}
      <EntityStoreHealth currentEntityStoreStatus={status} />
      <EuiSwitch
        showLabel={false}
        label=""
        onChange={onSwitch}
        data-test-subj="entity-store-switch"
        checked={entityStoreEnabledStatuses.includes(status)}
        disabled={isDisabled}
      />
    </EuiFlexGroup>
  );
};

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
