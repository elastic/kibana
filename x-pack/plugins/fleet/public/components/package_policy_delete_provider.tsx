/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useMemo, useRef, useState } from 'react';
import { EuiCallOut, EuiConfirmModal, EuiSpacer, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  useStartServices,
  sendDeletePackagePolicy,
  sendDeleteAgentPolicy,
  useConfig,
  sendGetAgents,
  useMultipleAgentPolicies,
} from '../hooks';
import { AGENTS_PREFIX } from '../../common/constants';
import type { AgentPolicy } from '../types';

interface Props {
  agentPolicies?: AgentPolicy[];
  children: (deletePackagePoliciesPrompt: DeletePackagePoliciesPrompt) => React.ReactElement;
}

export type DeletePackagePoliciesPrompt = (
  packagePoliciesToDelete: string[],
  onSuccess?: OnSuccessCallback
) => void;

type OnSuccessCallback = (packagePoliciesDeleted: string[]) => void;

export const PackagePolicyDeleteProvider: React.FunctionComponent<Props> = ({
  agentPolicies,
  children,
}) => {
  const { notifications } = useStartServices();
  const {
    agents: { enabled: isFleetEnabled },
  } = useConfig();
  const [packagePolicies, setPackagePolicies] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoadingAgentsCount, setIsLoadingAgentsCount] = useState<boolean>(false);
  const [agentsCount, setAgentsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);
  const { canUseMultipleAgentPolicies } = useMultipleAgentPolicies();

  const isShared = useMemo(() => {
    if (agentPolicies?.length !== 1) {
      return false;
    }
    const packagePolicy = agentPolicies[0].package_policies?.find(
      (policy) => policy.id === packagePolicies[0]
    );
    return (packagePolicy?.policy_ids?.length ?? 0) > 1;
  }, [agentPolicies, packagePolicies]);

  const hasMultipleAgentPolicies =
    canUseMultipleAgentPolicies && agentPolicies && agentPolicies.length > 1;

  const fetchAgentsCount = useMemo(
    () => async () => {
      if (isLoadingAgentsCount || !isFleetEnabled || !agentPolicies) {
        return;
      }
      setIsLoadingAgentsCount(true);

      const kuery = `(${agentPolicies
        .map((policy) => `${AGENTS_PREFIX}.policy_id:"${policy.id}"`)
        .join(' or ')})`;

      const request = await sendGetAgents({
        kuery,
        showInactive: true,
      });
      setAgentsCount(request.data?.total || 0);
      setIsLoadingAgentsCount(false);
    },
    [agentPolicies, isFleetEnabled, isLoadingAgentsCount]
  );

  const deletePackagePoliciesPrompt = useMemo(
    (): DeletePackagePoliciesPrompt =>
      (packagePoliciesToDelete, onSuccess = () => undefined) => {
        if (!Array.isArray(packagePoliciesToDelete) || packagePoliciesToDelete.length === 0) {
          throw new Error('No package policies specified for deletion');
        }
        setIsModalOpen(true);
        setPackagePolicies(packagePoliciesToDelete);
        fetchAgentsCount();
        onSuccessCallback.current = onSuccess;
      },
    [fetchAgentsCount]
  );

  const closeModal = useMemo(
    () => () => {
      setPackagePolicies([]);
      setIsLoading(false);
      setIsLoadingAgentsCount(false);
      setIsModalOpen(false);
    },
    []
  );

  const agentPoliciesNamesList = useMemo(
    () => agentPolicies?.map((p) => p.name).join(', '),
    [agentPolicies]
  );

  const deletePackagePolicies = useMemo(
    () => async () => {
      setIsLoading(true);

      try {
        const { data } = await sendDeletePackagePolicy({ packagePolicyIds: packagePolicies });
        const successfulResults = data?.filter((result) => result.success) || [];
        const failedResults = data?.filter((result) => !result.success) || [];

        if (successfulResults.length) {
          const hasMultipleSuccesses = successfulResults.length > 1;
          const successMessage = hasMultipleSuccesses
            ? i18n.translate('xpack.fleet.deletePackagePolicy.successMultipleNotificationTitle', {
                defaultMessage: 'Deleted {count} integrations',
                values: { count: successfulResults.length },
              })
            : i18n.translate('xpack.fleet.deletePackagePolicy.successSingleNotificationTitle', {
                defaultMessage: "Deleted integration ''{id}''",
                values: { id: successfulResults[0].name || successfulResults[0].id },
              });

          const agentlessPolicy = agentPolicies?.find(
            (policy) => policy.supports_agentless === true
          );

          if (!!agentlessPolicy) {
            try {
              await sendDeleteAgentPolicy({ agentPolicyId: agentlessPolicy.id });
            } catch (e) {
              notifications.toasts.addDanger(
                i18n.translate(
                  'xpack.fleet.deletePackagePolicy.fatalErrorAgentlessNotificationTitle',
                  {
                    defaultMessage: 'Error deleting agentless deployment',
                  }
                )
              );
            }
          }

          notifications.toasts.addSuccess(successMessage);
        }

        if (failedResults.length) {
          const hasMultipleFailures = failedResults.length > 1;
          const failureMessage = hasMultipleFailures
            ? i18n.translate('xpack.fleet.deletePackagePolicy.failureMultipleNotificationTitle', {
                defaultMessage: 'Error deleting {count} integrations',
                values: { count: failedResults.length },
              })
            : i18n.translate('xpack.fleet.deletePackagePolicy.failureSingleNotificationTitle', {
                defaultMessage: "Error deleting integration ''{id}''",
                values: { id: failedResults[0].id },
              });
          notifications.toasts.addDanger(failureMessage);
        }

        if (onSuccessCallback.current) {
          onSuccessCallback.current(successfulResults.map((result) => result.id));
        }
      } catch (e) {
        notifications.toasts.addDanger(
          i18n.translate('xpack.fleet.deletePackagePolicy.fatalErrorNotificationTitle', {
            defaultMessage: 'Error deleting integration',
          })
        );
      }
      closeModal();
    },
    [closeModal, packagePolicies, notifications.toasts, agentPolicies]
  );

  const renderModal = () => {
    const isAgentlessPolicy = agentPolicies?.find((policy) => policy?.supports_agentless === true);
    const packagePolicy = agentPolicies?.[0]?.package_policies?.find(
      (policy) => policy.id === packagePolicies[0]
    );
    if (!isModalOpen) {
      return null;
    }

    return (
      <EuiConfirmModal
        title={
          isAgentlessPolicy ? (
            <FormattedMessage
              id="xpack.fleet.deletePackagePolicy.confirmModal.agentlessTitle"
              defaultMessage="You’re about to delete an integration"
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.deletePackagePolicy.confirmModal.deleteMultipleTitle"
              defaultMessage="Delete {count, plural, one {integration} other {# integrations}}?"
              values={{ count: packagePolicies.length }}
            />
          )
        }
        onCancel={closeModal}
        onConfirm={deletePackagePolicies}
        cancelButtonText={
          <FormattedMessage
            id="xpack.fleet.deletePackagePolicy.confirmModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonText={
          isLoading || isLoadingAgentsCount ? (
            <FormattedMessage
              id="xpack.fleet.deletePackagePolicy.confirmModal.loadingButtonLabel"
              defaultMessage="Loading…"
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.deletePackagePolicy.confirmModal.confirmButtonLabel"
              defaultMessage="Delete {agentPoliciesCount, plural, one {integration} other {integrations}}"
              values={{
                agentPoliciesCount: packagePolicies.length,
              }}
            />
          )
        }
        buttonColor="danger"
        confirmButtonDisabled={isLoading || isLoadingAgentsCount}
      >
        {(hasMultipleAgentPolicies || isShared) && (
          <>
            <EuiCallOut
              color="warning"
              iconType="alert"
              title={
                <FormattedMessage
                  id="xpack.fleet.deletePackagePolicy.confirmModal.warningMultipleAgentPolicies"
                  defaultMessage="This integration is shared by multiple agent policies."
                />
              }
            />
            <EuiSpacer size="m" />
          </>
        )}

        {isLoadingAgentsCount ? (
          <FormattedMessage
            id="xpack.fleet.deletePackagePolicy.confirmModal.loadingAgentsCountMessage"
            defaultMessage="Checking affected agents…"
          />
        ) : agentsCount && agentPolicies ? (
          <>
            <EuiCallOut
              color="danger"
              title={
                !isAgentlessPolicy && (
                  <FormattedMessage
                    id="xpack.fleet.deletePackagePolicy.confirmModal.affectedAgentsTitle"
                    defaultMessage="This action will affect {agentsCount} {agentsCount, plural, one {agent} other {agents}}."
                    values={{ agentsCount }}
                  />
                )
              }
            >
              {hasMultipleAgentPolicies && !isAgentlessPolicy && (
                <FormattedMessage
                  id="xpack.fleet.deletePackagePolicy.confirmModal.affectedAgentPoliciesMessage"
                  defaultMessage="Fleet has detected that the related agent policies {toolTip} are already in use by some of your agents."
                  values={{
                    toolTip: (
                      <EuiIconTip
                        type="iInCircle"
                        iconProps={{
                          className: 'eui-alignTop',
                        }}
                        content={
                          <FormattedMessage
                            id="xpack.fleet.fleetServerSetup.affectedAgentsMessageTooltips"
                            defaultMessage="{policies}"
                            values={{ policies: agentPoliciesNamesList }}
                          />
                        }
                        position="top"
                      />
                    ),
                  }}
                />
              )}{' '}
              {!hasMultipleAgentPolicies && !isAgentlessPolicy && (
                <FormattedMessage
                  id="xpack.fleet.deletePackagePolicy.confirmModal.affectedAgentsMessage"
                  defaultMessage="Fleet has detected that {agentPolicyName} is already in use by some of your agents."
                  values={{
                    agentPolicyName: <strong>{agentPolicies[0]?.name}</strong>,
                  }}
                />
              )}
              {!hasMultipleAgentPolicies && isAgentlessPolicy && (
                <FormattedMessage
                  id="xpack.fleet.deletePackagePolicy.agentless.confirmModal.message"
                  defaultMessage="Deleting {packagePolicyName} integration will stop data ingestion."
                  values={{
                    packagePolicyName: <strong>{packagePolicy?.name}</strong>,
                  }}
                />
              )}
            </EuiCallOut>
            <EuiSpacer size="l" />
          </>
        ) : null}

        {!isLoadingAgentsCount && (
          <FormattedMessage
            id="xpack.fleet.deletePackagePolicy.confirmModal.generalMessage"
            defaultMessage="This action can not be undone. Are you sure you wish to continue?"
          />
        )}
      </EuiConfirmModal>
    );
  };

  return (
    <Fragment>
      {children(deletePackagePoliciesPrompt)}
      {renderModal()}
    </Fragment>
  );
};
