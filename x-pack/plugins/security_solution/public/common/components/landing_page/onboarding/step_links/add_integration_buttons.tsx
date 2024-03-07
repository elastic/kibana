/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type SVGProps } from 'react';
import { i18n } from '@kbn/i18n';
import { LinkButton } from '@kbn/security-solution-navigation/links';
import type { IconType } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';

const SEE_INTEGRATIONS = i18n.translate(
  'xpack.securitySolution.onboarding.step.addIntegrations.seeIntegrationsButton',
  { defaultMessage: 'See integrations' }
);
const ADD_CLOUD_INTEGRATIONS_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.step.addIntegrations.addCloudIntegrations.title',
  { defaultMessage: 'Add Cloud Security data' }
);
const ADD_CLOUD_INTEGRATIONS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.step.addIntegrations.addCloudIntegrations.description',
  { defaultMessage: 'Cloud-specific security integrations' }
);
const ADD_EDR_XDR_INTEGRATIONS_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.step.addIntegrations.addEdrXdrIntegrations.title',
  { defaultMessage: 'Add EDR/XDR data' }
);
const ADD_EDR_XDR_INTEGRATIONS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.step.addIntegrations.addEdrXdrIntegrations.description',
  { defaultMessage: 'EDR/XDR-specific security integrations' }
);
const ADD_ALL_INTEGRATIONS_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.step.addIntegrations.addAllIntegrations.title',
  { defaultMessage: 'All security integrations' }
);
const ADD_ALL_INTEGRATIONS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.step.addIntegrations.addAllIntegrations.description',
  { defaultMessage: 'The full set of security integrations' }
);

enum IntegrationsPageName {
  integrationsSecurity = 'integrations:/browse/security',
  integrationsSecurityCloud = 'integrations:/browse/security/cloudsecurity_cdr',
  integrationsSecurityEdrXrd = 'integrations:/browse/security/edr_xdr',
}

const CloudIntegrationsIcon: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M5.08008 18.7995C2.26902 18.7676 0 16.4581 0 13.6142C0 10.7504 2.30088 8.42882 5.13916 8.42882C5.15374 8.42882 5.16831 8.42888 5.18287 8.429C5.8371 4.10905 9.53542 0.799805 13.9998 0.799805C18.4641 0.799805 22.1624 4.10905 22.8167 8.429C22.8312 8.42888 22.8458 8.42882 22.8604 8.42882C25.6987 8.42882 27.9995 10.7504 27.9995 13.6142C27.9995 16.4581 25.7305 18.7676 22.9195 18.7995H5.08008Z"
      fill="#343741"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.00012 16.3996C12.1797 16.3996 17.9999 10.5794 17.9999 3.39986C17.9999 2.82316 17.9624 2.25523 17.8896 1.69839C16.714 1.12268 15.3942 0.799805 13.9998 0.799805C9.53542 0.799805 5.8371 4.10905 5.18287 8.429L5.13916 8.42882C2.30088 8.42882 0 10.7504 0 13.6142C0 14.2989 0.131541 14.9526 0.370513 15.5511C1.80873 16.0994 3.36936 16.3996 5.00012 16.3996Z"
      fill="#0077CC"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M22.8227 8.42887L22.8608 8.42871C25.6991 8.42871 28 10.7503 28 13.6141C28 16.4579 25.731 18.7675 22.9199 18.7994H16.8138C17.012 14.4375 19.3597 10.6359 22.8227 8.42887Z"
      fill="#00BFB3"
    />
    <path
      d="M23.6655 22.1415L23.9999 22.2602L24.3344 22.1415C24.7834 21.9821 25.2825 21.6651 25.7452 21.3081C26.2247 20.9382 26.7305 20.4743 27.194 19.9624C27.6559 19.4523 28.0945 18.874 28.4227 18.2721C28.7447 17.6815 28.9999 16.9964 28.9999 16.293V11.1992V10.1992H27.9999H20H19V11.1992V16.293C19 16.9964 19.2552 17.6815 19.5772 18.2721C19.9054 18.874 20.344 19.4523 20.8058 19.9624C21.2694 20.4743 21.7751 20.9382 22.2546 21.3081C22.7173 21.6651 23.2165 21.9821 23.6655 22.1415Z"
      fill="#FA744E"
      stroke="#F7F8FC"
      strokeWidth="2"
    />
  </svg>
);

const EdrXdrIntegrationsIcon: React.FC<SVGProps<SVGSVGElement>> = ({ ...props }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_3269_21193)">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.5 11.9997L4.404 1.68421C3.38775 -0.0370402 0.75 0.68446 0.75 2.68321V21.3162C0.75 23.315 3.38775 24.0365 4.404 22.3152L10.5 11.9997Z"
        fill="#F04E98"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.1133 12L12.4376 13.1445L6.34156 23.46C6.22681 23.6535 6.09706 23.8305 5.95831 24H12.8403C14.6508 24 16.3331 23.0677 17.2923 21.5325L23.2503 12H13.1133Z"
        fill="#FA744E"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.2924 2.4675C16.3332 0.93225 14.6509 0 12.8397 0H5.95844C6.09644 0.1695 6.22694 0.3465 6.34094 0.54L12.4369 10.8555L13.1134 12H23.2497L17.2924 2.4675Z"
        fill="#343741"
      />
    </g>
    <defs>
      <clipPath id="clip0_3269_21193">
        <rect width="24" height="24" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

const AddIntegrationPanel: React.FC<{
  icon: IconType;
  title: string;
  description: string;
  buttonId: IntegrationsPageName;
}> = React.memo(({ title, description, buttonId, icon }) => (
  <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon type={icon} size="xl" />
      </EuiFlexItem>
      <EuiFlexItem>
        <h4>{title}</h4>
        <EuiText color="subdued" size="xs">
          {description}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <LinkButton id={buttonId}>{SEE_INTEGRATIONS}</LinkButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
));
AddIntegrationPanel.displayName = 'AddIntegrationPanel';

export const AddIntegrationButtons: React.FC = React.memo(() => (
  <EuiFlexGroup direction="column" className="step-paragraph" gutterSize="m">
    <EuiFlexItem grow={false}>
      <AddIntegrationPanel
        title={ADD_CLOUD_INTEGRATIONS_TITLE}
        description={ADD_CLOUD_INTEGRATIONS_DESCRIPTION}
        icon={CloudIntegrationsIcon}
        buttonId={IntegrationsPageName.integrationsSecurityCloud}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <AddIntegrationPanel
        title={ADD_EDR_XDR_INTEGRATIONS_TITLE}
        description={ADD_EDR_XDR_INTEGRATIONS_DESCRIPTION}
        icon={EdrXdrIntegrationsIcon}
        buttonId={IntegrationsPageName.integrationsSecurityEdrXrd}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <AddIntegrationPanel
        title={ADD_ALL_INTEGRATIONS_TITLE}
        description={ADD_ALL_INTEGRATIONS_DESCRIPTION}
        icon="logoSecurity"
        buttonId={IntegrationsPageName.integrationsSecurity}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
));
AddIntegrationButtons.displayName = 'AddIntegrationButtons';
