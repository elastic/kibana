/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

// import { useLocation } from 'react-router-dom';

import { css } from '@emotion/react';
// import { useValues } from 'kea';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { EuiStepInterface } from '@elastic/eui/src/components/steps/step';
import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n-react';

import { EnterpriseSearchContentPageTemplate } from '../../layout';
import { connectorsBreadcrumbs } from '../connectors';

import connectorsBackgroundImage from './assets/connector_logos_comp.png';
import { StartStep } from './start_step';

export const CreateConnector: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  
  const [selfManaged, setSelfManaged] = useState(false);

  const selfManagedSteps: EuiStepInterface[] = [
    {
      title: 'Start',
      children: <EuiSpacer size="xs" />,
      status: 'current',
    },
    {
      title: 'Deployment',
      children: '',
      status: 'incomplete',
    },
    {
      title: 'Configuration',
      children: '',
      status: 'incomplete',
    },
    {
      title: 'Finish up',
      children: '',
      status: 'incomplete',
    },
  ];

  const elasticManagedSteps: EuiStepInterface[] = [
    {
      title: 'Start',
      children: <EuiSpacer size="xs" />,
      status: 'current',
    },
    {
      title: 'Configuration',
      children: '',
      status: 'incomplete',
    },
    {
      title: 'Finish up',
      children: '',
      status: 'incomplete',
    },
  ];

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[
        ...connectorsBreadcrumbs,
        i18n.translate('xpack.enterpriseSearch.content.indices.selectConnector.breadcrumb', {
          defaultMessage: 'New connector',
        }),
      ]}
      pageViewTelemetry="create_connector"
      isLoading={false}
      pageHeader={{
        description: i18n.translate(
          'xpack.enterpriseSearch.content.indices.selectConnector.description',
          {
            defaultMessage:
              'Extract, transform, index and sync data from a third-party data source.',
          }
        ),
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.indices.selectConnector.title', {
          defaultMessage: 'Create a connector',
        }),
      }}
    >
      <EuiFlexGroup gutterSize="m">
        {/* Col 1 */}
        <EuiFlexItem grow={2}>
          <EuiPanel
            hasShadow={false}
            hasBorder
            color="subdued"
            paddingSize="l"
            css={css`
              background-image: url(${connectorsBackgroundImage});
              background-size: contain;
              background-repeat: no-repeat;
              background-position: bottom center;
            `}
          >
            <EuiButtonEmpty iconType="arrowLeft" size="s">
              Back
            </EuiButtonEmpty>
            <EuiSpacer size="xl" />
            <EuiSteps
              titleSize="xxs"
              steps={selfManaged === true ? elasticManagedSteps : selfManagedSteps}
              css={({ euiTheme }) => css`
                .euiStep__content {
                  padding-block-end: ${euiTheme.size.m};
                }
              `}
            />
          </EuiPanel>
        </EuiFlexItem>
        {/* Col 2 */}
        <EuiFlexItem grow={7}>
          <StartStep onRadioButtonChange={setSelfManaged} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EnterpriseSearchContentPageTemplate>
  );
};
