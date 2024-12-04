/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { EuiTitle, EuiSpacer } from '@elastic/eui';

import { IntegrationBreadcrumb } from '../components';
import { PageSteps } from '../multi_page_layout/components';
import type { MultiPageStepLayoutProps } from '../multi_page_layout/types';
import { Error } from '../../../../components';
import { pkgKeyFromPackageInfo } from '../../../../services';
import { WithHeaderLayout } from '../../../../layouts';

export const EmbeddedIntegrationStepsLayout: React.FunctionComponent<MultiPageStepLayoutProps> = (
  props
) => {
  const {
    packageInfo,
    integrationInfo,
    steps,
    currentStep,
    error,
    withHeader = true,
    withBreadcrumb = true,
  } = props;

  if (error) {
    return (
      <Error
        title={
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.errorLoadingPackageTitle"
            defaultMessage="Error loading package information"
          />
        }
        error={error}
      />
    );
  }

  const StepComponent = steps[currentStep].component;
  const topContent = (
    <>
      <EuiTitle size="l" className="eui-textCenter">
        <h1>
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.multiPageTitle"
            defaultMessage="Set up {title} integration"
            values={{
              title: packageInfo.title,
            }}
          />
        </h1>
      </EuiTitle>
      <EuiSpacer size="m" />
      <PageSteps currentStep={currentStep} steps={steps.map((s) => s.title)} />
      <EuiSpacer size="xl" />
    </>
  );

  const maxWidth = 866;

  if (!withHeader) {
    return (
      <>
        <StepComponent {...props} />
        {packageInfo && withBreadcrumb && (
          <IntegrationBreadcrumb
            pkgTitle={integrationInfo?.title || packageInfo.title}
            pkgkey={pkgKeyFromPackageInfo(packageInfo)}
            integration={integrationInfo?.name}
          />
        )}
      </>
    );
  }

  return (
    <WithHeaderLayout
      topContent={topContent}
      restrictHeaderWidth={maxWidth}
      restrictWidth={maxWidth}
    >
      <StepComponent {...props} />
      {packageInfo && withBreadcrumb && (
        <IntegrationBreadcrumb
          pkgTitle={integrationInfo?.title || packageInfo.title}
          pkgkey={pkgKeyFromPackageInfo(packageInfo)}
          integration={integrationInfo?.name}
        />
      )}
    </WithHeaderLayout>
  );
};
