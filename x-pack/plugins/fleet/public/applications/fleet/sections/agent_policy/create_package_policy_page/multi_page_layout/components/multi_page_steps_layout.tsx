/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';

import { FormattedMessage } from '@kbn/i18n-react';

import { EuiTitle, EuiSpacer } from '@elastic/eui';

import { IntegrationBreadcrumb } from '../../components';
import { pkgKeyFromPackageInfo } from '../../../../../services';
import { WithHeaderLayout } from '../../../../../layouts';

import type { MultiPageStepLayoutProps } from '../types';

import { PageSteps } from '.';

const CentralH1 = styled('h1')`
  text-align: center;
`;

export const MultiPageStepsLayout = (props: MultiPageStepLayoutProps) => {
  const { packageInfo, integrationInfo, steps, currentStep } = props;

  const StepComponent = steps[currentStep].component;
  const topContent = (
    <>
      <EuiTitle size="l">
        <CentralH1>
          <FormattedMessage
            id="xpack.fleet.addFirstIntegrationSplash.pageTitle"
            defaultMessage="Set up {title} integration"
            values={{
              title: packageInfo.title,
            }}
          />
        </CentralH1>
      </EuiTitle>
      <EuiSpacer size="m" />
      <PageSteps currentStep={currentStep} steps={steps.map((s) => s.title)} />
      <EuiSpacer size="xl" />
    </>
  );

  const maxWidth = 866;
  return (
    <WithHeaderLayout
      topContent={topContent}
      restrictHeaderWidth={maxWidth}
      restrictWidth={maxWidth}
    >
      <StepComponent {...props} />

      {packageInfo && (
        <IntegrationBreadcrumb
          pkgTitle={integrationInfo?.title || packageInfo.title}
          pkgkey={pkgKeyFromPackageInfo(packageInfo)}
          integration={integrationInfo?.name}
        />
      )}
    </WithHeaderLayout>
  );
};
