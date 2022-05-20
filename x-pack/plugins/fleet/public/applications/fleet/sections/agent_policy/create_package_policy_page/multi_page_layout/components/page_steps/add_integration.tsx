/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText, EuiCallOut, EuiLink, EuiButton, EuiSpacer } from '@elastic/eui';
import { safeLoad } from 'js-yaml';

import type { MultiPageStepLayoutProps } from '../../types';
import type { PackagePolicyFormState } from '../../../types';
import type { NewPackagePolicy } from '../../../../../../types';
import {
  sendCreatePackagePolicy,
  useStartServices,
  useGetPackageInfoByKey,
} from '../../../../../../hooks';
import { Loading, Error } from '../../../../../../components';
import { sendGeneratePackagePolicy } from '../../hooks';
import { CreatePackagePolicyBottomBar } from '..';
import type { PackagePolicyValidationResults } from '../../../services';
import { validatePackagePolicy, validationHasErrors } from '../../../services';
import { StepConfigurePackagePolicy } from '../../../single_page_layout/step_configure_package';
const StandaloneWarningCallout: React.FC<{
  setIsManaged: MultiPageStepLayoutProps['setIsManaged'];
}> = ({ setIsManaged }) => {
  return (
    <EuiCallOut
      title="Setting up to run Elastic Agent in standalone mode"
      color="primary"
      iconType="iInCircle"
    >
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.addIntegration.standaloneWarning"
          defaultMessage="Setting up integrations by running Elastic Agent in standalone mode is advanced. When possible, we recommend using {link} instead. "
          values={{ link: <EuiLink href="#">Fleet-managed agents</EuiLink> }}
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiButton onClick={() => setIsManaged(true)} color="primary">
        <FormattedMessage
          id="xpack.fleet.addIntegration.switchToManagedButton"
          defaultMessage="Enroll in Fleet instead (recommended)"
        />
      </EuiButton>
    </EuiCallOut>
  );
};

export const AddIntegrationPageStep: React.FC<MultiPageStepLayoutProps> = (props) => {
  const { onNext, onBack, isManaged, setIsManaged, packageInfo, integrationInfo, agentPolicy } =
    props;
  if (!agentPolicy) {
    // TODO: sort this
    throw 'agent policy not provided'; // eslint-disable-line
  }

  // Fetch package info
  const {
    data: packageInfoData,
    error: packageInfoError,
    isLoading: isPackageInfoLoading,
  } = useGetPackageInfoByKey(packageInfo.name, packageInfo.version); // TODO: is this needed?
  const fullPackageInfo = useMemo(() => {
    if (packageInfoData && packageInfoData.item) {
      return packageInfoData.item;
    }
  }, [packageInfoData]);

  const { notifications } = useStartServices();
  const [formState, setFormState] = useState<PackagePolicyFormState>('VALID');
  const [validationResults, setValidationResults] = useState<PackagePolicyValidationResults>();

  const [packagePolicy, setPackagePolicy] = useState<NewPackagePolicy>({
    name: '',
    description: '',
    namespace: 'default',
    policy_id: '',
    enabled: true,
    output_id: '', // TODO: Blank for now as we only support default output
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
  const savePackagePolicy = async (pkgPolicy: NewPackagePolicy) => {
    setFormState('LOADING');
    const result = await sendCreatePackagePolicy(pkgPolicy);
    setFormState('SUBMITTED');
    return result;
  };

  const onSubmit = useCallback(async () => {
    const hasErrors = validationResults ? validationHasErrors(validationResults) : false;

    if (formState === 'VALID' && hasErrors) {
      setFormState('INVALID');
      return;
    }
    setFormState('LOADING');

    const { error } = await savePackagePolicy(packagePolicy);
    if (error) {
      notifications.toasts.addError(error, {
        title: 'Error',
      });
      setFormState('VALID');
    } else {
      onNext();
    }
  }, [validationResults, formState, packagePolicy, notifications.toasts, onNext]);

  useEffect(() => {
    const getBasePolicy = async () => {
      const { packagePolicy: basePackagePolicy, error } = await sendGeneratePackagePolicy(
        agentPolicy.id,
        packageInfo,
        integrationInfo?.name
      );

      if (error) {
        // TODO: do something
      }
      updatePackagePolicy(basePackagePolicy);
    };
    getBasePolicy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (packageInfoError) {
    return <Error title={<>Oh no</>} error={packageInfoError} />; // TODO: make nice
  }

  if (isPackageInfoLoading) {
    return <Loading />;
  }

  return (
    <>
      {isManaged ? null : <StandaloneWarningCallout setIsManaged={setIsManaged} />}
      <StepConfigurePackagePolicy
        packageInfo={fullPackageInfo!}
        showOnlyIntegration={integrationInfo?.name}
        packagePolicy={packagePolicy}
        updatePackagePolicy={updatePackagePolicy}
        validationResults={validationResults!}
        submitAttempted={formState === 'INVALID'}
      />
      <CreatePackagePolicyBottomBar
        cancelClickHandler={onBack}
        onNext={onSubmit}
        isLoading={formState === 'LOADING'}
        isDisabled={formState === 'INVALID'}
        actionMessage={
          <FormattedMessage
            id="xpack.fleet.createFirstPackagePolicy.confirm"
            defaultMessage="Confirm incoming data"
          />
        }
      />
    </>
  );
};
