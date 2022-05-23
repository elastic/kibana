/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText, EuiCallOut, EuiLink, EuiButton, EuiSpacer } from '@elastic/eui';
import { safeLoad } from 'js-yaml';

import { i18n } from '@kbn/i18n';

import type { MultiPageStepLayoutProps } from '../../types';
import type { PackagePolicyFormState } from '../../../types';
import type { NewPackagePolicy } from '../../../../../../types';
import { sendCreatePackagePolicy, useStartServices } from '../../../../../../hooks';
import type { RequestError } from '../../../../../../hooks';
import { Error } from '../../../../../../components';
import { sendGeneratePackagePolicy } from '../../hooks';
import { CreatePackagePolicyBottomBar } from '..';
import type { PackagePolicyValidationResults } from '../../../services';
import { validatePackagePolicy, validationHasErrors } from '../../../services';
import { NotObscuredByBottomBar } from '..';
import { StepConfigurePackagePolicy } from '../../../components';
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
          id={'xpack.fleet.addIntegration.errorTitle'}
          defaultMessage={'Error adding integration'}
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

  const [packagePolicy, setPackagePolicy] = useState<NewPackagePolicy>({
    name: '',
    description: '',
    namespace: 'default',
    policy_id: '',
    enabled: true,
    output_id: '',
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
      {isManaged ? null : <StandaloneWarningCallout setIsManaged={setIsManaged} />}
      <EuiSpacer size={'l'} />
      <StepConfigurePackagePolicy
        packageInfo={packageInfo}
        showOnlyIntegration={integrationInfo?.name}
        packagePolicy={packagePolicy}
        updatePackagePolicy={updatePackagePolicy}
        validationResults={validationResults!}
        submitAttempted={formState === 'INVALID'}
        noTopRule={true}
      />
      <NotObscuredByBottomBar />
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
