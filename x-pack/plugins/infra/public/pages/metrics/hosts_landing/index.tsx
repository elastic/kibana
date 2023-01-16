/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate, EuiButton, EuiImage } from '@elastic/eui';
import { css } from '@emotion/react';
import { useEuiBackgroundColor } from '@elastic/eui';
import { MetricsPageTemplate } from '../page_template';

export const HostsLandingPage = () => (
  <MetricsPageTemplate>
    <EuiPageTemplate.EmptyPrompt
      title={<h2>Introducing: Host Analysis</h2>}
      icon={
        <EuiImage
          size="fullWidth"
          src="https://elastic.github.io/eui/images/bb68cce79d5e28fcd85dce0eca39c112-illustration.svg"
          alt=""
        />
      }
      color="plain"
      layout="horizontal"
      body={
        <>
          <p>
            Introducing our new &apos;Hosts&apos; feature, now available in technical preview! With
            this powerful tool, you can easily view and analyse your hosts and identify any issues
            so you address them quickly. Get a detailed view of metrics for your hosts, see which
            ones are triggering the most alerts and filter the hosts you want to analyse using any
            KQL filter and easy breakdowns such as cloud provider and operating system.
          </p>
          <p>
            This is an early version of the feature and we would love your feedback as we continue
            to develop and improve it. To access the feature, simply enable below. Don&apos;t miss
            out on this powerful new addition to our platform - try it out today!
          </p>
        </>
      }
      css={css`
        background-color: ${useEuiBackgroundColor('subdued')};
      `}
      actions={<EuiButton color="primary">Enable hosts view</EuiButton>}
    />
  </MetricsPageTemplate>
);
