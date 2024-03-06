/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiButtonEmpty, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { safeLoad } from 'js-yaml';

import { i18n } from '@kbn/i18n';

import { useConfirmForceInstall } from '../../../../../../../integrations/hooks';

import { isVerificationError } from '../../../../../../../../services';

import type { MultiPageStepLayoutProps } from '../../types';
import type { PackagePolicyFormState } from '../../../types';
import type { NewPackagePolicy } from '../../../../../../types';
import { sendCreatePackagePolicy, useStartServices, useUIExtension } from '../../../../../../hooks';
import type { RequestError } from '../../../../../../hooks';
import { Error, ExtensionWrapper } from '../../../../../../components';
import { sendGeneratePackagePolicy } from '../../hooks';
import { CreatePackagePolicyBottomBar, StandaloneModeWarningCallout } from '..';
import type { PackagePolicyValidationResults } from '../../../services';
import { validatePackagePolicy, validationHasErrors } from '../../../services';
import { NotObscuredByBottomBar } from '..';
import { StepConfigurePackagePolicy, StepDefinePackagePolicy } from '../../../components';
import { prepareInputPackagePolicyDataset } from '../../../services/prepare_input_pkg_policy_dataset';

const ExpandableAdvancedSettings: React.FC = ({ children }) => {
  const [isShowingAdvanced, setIsShowingAdvanced] = useState<boolean>(false);

  return (
    <EuiFlexItem>
      <EuiFlexGroup justifyContent="spaceBetween" direction="column">
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" direction="row">
            <EuiFlexItem>{/* intentionally empty */}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType={isShowingAdvanced ? 'arrowUp' : 'arrowDown'}
                iconSide="right"
                onClick={() => setIsShowingAdvanced(!isShowingAdvanced)}
                flush="left"
              >
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicy.stepConfigure.advancedOptionsToggleLinkText"
                  defaultMessage="Advanced options"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {isShowingAdvanced && <EuiFlexItem>{children}</EuiFlexItem>}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
const AddIntegrationError: React.FC<{ error: Error | string; title?: JSX.Element }> = ({
  error,
  title,
}) => (
  <Error
    title={
      title ? (
        title
      ) : (
        <FormattedMessage
          id="xpack.fleet.addIntegration.errorTitle"
          defaultMessage="Error adding integration"
        />
      )
    }
    error={error}
  />
);

export const AddIntegrationPageStep: React.FC<MultiPageStepLayoutProps> = (props) => {
  const { onNext, onBack, isManaged, setIsManaged, packageInfo, integrationInfo, agentPolicy } =
    props;

  const [basePolicyError, setBasePolicyError] = useState<RequestError>();

  const { notifications } = useStartServices();
  const [formState, setFormState] = useState<PackagePolicyFormState>('VALID');
  const [validationResults, setValidationResults] = useState<PackagePolicyValidationResults>();
  const confirmForceInstall = useConfirmForceInstall();
  const [packagePolicy, setPackagePolicy] = useState<NewPackagePolicy>({
    name: '',
    description: '',
    namespace: '',
    policy_id: '',
    enabled: true,
    inputs: [],
  });

  // Update package policy validation
  const updatePackagePolicyValidation = useCallback(
    (newPackagePolicy?: NewPackagePolicy) => {
      const newValidationResult = validatePackagePolicy(
        { ...packagePolicy, ...newPackagePolicy },
        packageInfo,
        safeLoad
      );
      setValidationResults(newValidationResult);
      // eslint-disable-next-line no-console
      console.debug('Package policy validation results', newValidationResult);

      return newValidationResult;
    },
    [packageInfo, packagePolicy]
  );
  // Update package policy method
  const updatePackagePolicy = useCallback(
    (updatedFields: Partial<NewPackagePolicy>) => {
      const newPackagePolicy = {
        ...packagePolicy,
        ...updatedFields,
      } as NewPackagePolicy;
      setPackagePolicy(newPackagePolicy);

      // eslint-disable-next-line no-console
      console.debug('Package policy updated', newPackagePolicy);
      const newValidationResults = updatePackagePolicyValidation(newPackagePolicy);
      const hasPackage = newPackagePolicy.package;
      const hasValidationErrors = newValidationResults
        ? validationHasErrors(newValidationResults)
        : false;
      if (hasPackage && !hasValidationErrors) {
        setFormState('VALID');
      } else {
        setFormState('INVALID');
      }
    },
    [packagePolicy, updatePackagePolicyValidation]
  );

  // Save package policy
  const savePackagePolicy = async ({
    newPackagePolicy,
    force,
  }: {
    newPackagePolicy: NewPackagePolicy;
    force?: boolean;
  }) => {
    setFormState('LOADING');
    const { policy, forceCreateNeeded } = await prepareInputPackagePolicyDataset(newPackagePolicy);
    const result = await sendCreatePackagePolicy({
      ...policy,
      force: forceCreateNeeded || force,
    });
    setFormState('SUBMITTED');
    return result;
  };

  const onSubmit = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      const hasErrors = validationResults ? validationHasErrors(validationResults) : false;

      if (formState === 'VALID' && hasErrors) {
        setFormState('INVALID');
        return;
      }
      setFormState('LOADING');

      const { error } = await savePackagePolicy({ newPackagePolicy: packagePolicy, force });
      if (error) {
        if (isVerificationError(error)) {
          const forceInstall = await confirmForceInstall(packageInfo);

          if (forceInstall) {
            onSubmit({ force: true });
          } else {
            setFormState('VALID');
          }
          return;
        }
        notifications.toasts.addError(error, {
          title: 'Error',
        });
        setFormState('VALID');
      } else {
        onNext();
      }
    },
    [
      validationResults,
      formState,
      packagePolicy,
      notifications.toasts,
      confirmForceInstall,
      packageInfo,
      onNext,
    ]
  );

  useEffect(() => {
    const getBasePolicy = async () => {
      if (!agentPolicy) {
        return;
      }
      const { packagePolicy: basePackagePolicy, error } = await sendGeneratePackagePolicy(
        agentPolicy.id,
        packageInfo,
        integrationInfo?.name
      );

      if (error) {
        setBasePolicyError(error);
      }
      updatePackagePolicy(basePackagePolicy);
    };
    getBasePolicy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const extensionView = useUIExtension(packageInfo.name ?? '', 'package-policy-create-multi-step');
  const addIntegrationExtensionView = useMemo(() => {
    return (
      extensionView && (
        <ExtensionWrapper>
          <extensionView.Component />
        </ExtensionWrapper>
      )
    );
  }, [extensionView]);

  const content = useMemo(() => {
    if (packageInfo.name !== 'endpoint') {
      return (
        <>
          <EuiSpacer size={'l'} />
          <StepConfigurePackagePolicy
            packageInfo={packageInfo}
            showOnlyIntegration={integrationInfo?.name}
            packagePolicy={packagePolicy}
            updatePackagePolicy={updatePackagePolicy}
            validationResults={validationResults}
            submitAttempted={formState === 'INVALID'}
            noTopRule={true}
          />
          {validationResults && (
            <ExpandableAdvancedSettings>
              <StepDefinePackagePolicy
                packageInfo={packageInfo}
                packagePolicy={packagePolicy}
                updatePackagePolicy={updatePackagePolicy}
                validationResults={validationResults}
                submitAttempted={formState === 'INVALID'}
                noAdvancedToggle={true}
              />
            </ExpandableAdvancedSettings>
          )}
        </>
      );
    }
  }, [
    formState,
    integrationInfo?.name,
    packageInfo,
    packagePolicy,
    updatePackagePolicy,
    validationResults,
  ]);

  if (!agentPolicy) {
    return (
      <AddIntegrationError
        error={i18n.translate('xpack.fleet.addIntegration.noAgentPolicy', {
          defaultMessage: 'Error creating agent policy.',
        })}
      />
    );
  }
  if (basePolicyError) {
    return <AddIntegrationError error={basePolicyError} />;
  }

  return (
    <>
      {isManaged ? null : <StandaloneModeWarningCallout setIsManaged={setIsManaged} />}
      {content}
      {addIntegrationExtensionView}
      <NotObscuredByBottomBar />
      <CreatePackagePolicyBottomBar
        cancelClickHandler={isManaged ? onBack : () => setIsManaged(true)}
        onNext={onSubmit}
        isLoading={formState === 'LOADING'}
        isDisabled={formState === 'INVALID'}
        loadingMessage={
          <FormattedMessage
            id="xpack.fleet.createFirstPackagePolicy.savingPackagePolicy"
            defaultMessage="Saving policy..."
          />
        }
        actionMessage={
          isManaged ? (
            <FormattedMessage
              id="xpack.fleet.createFirstPackagePolicy.confirmIncomingDataButton"
              defaultMessage="Confirm incoming data"
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.createFirstPackagePolicy.installAgentButton"
              defaultMessage="Save and continue"
            />
          )
        }
      />
    </>
  );
};
