/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiEmptyPrompt, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { useBreadcrumbs } from '../../hooks';
import { getServiceLocations } from '../../state';
import { SimpleMonitorForm } from './simple_monitor_form';
export const GettingStartedPage = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getServiceLocations());
  }, [dispatch]);

  useBreadcrumbs([{ text: MONITORING_OVERVIEW_LABEL }]); // No extra breadcrumbs on overview

  return (
    <Wrapper>
      <EuiEmptyPrompt
        title={<h2>{CREATE_SINGLE_PAGE_LABEL}</h2>}
        layout="horizontal"
        color="plain"
        body={
          <>
            <EuiText size="s">
              {OR_LABEL}{' '}
              <EuiLink href="/synthetics/monitors/add-new">{SELECT_DIFFERENT_MONITOR}</EuiLink>
              {i18n.translate('xpack.synthetics.gettingStarted.createSingle.description', {
                defaultMessage: ' to get started with Elastic Synthetics Monitoring',
              })}
            </EuiText>
            <EuiSpacer />
            <SimpleMonitorForm />
          </>
        }
        footer={
          <>
            <EuiText size="s" color="subdued" className="eui-displayInlineBlock">
              {FOR_MORE_INFO_LABEL}
            </EuiText>{' '}
            <EuiLink href="#" target="_blank" className="eui-displayInline">
              {GETTING_STARTED_LABEL}
            </EuiLink>
          </>
        }
      />
    </Wrapper>
  );
};

const Wrapper = styled.div`
  &&& {
    .euiEmptyPrompt__content {
      max-width: 40em;
      padding: 0;
    }
  }
`;

const FOR_MORE_INFO_LABEL = i18n.translate('xpack.synthetics.gettingStarted.forMoreInfo', {
  defaultMessage: 'For more information, read our',
});

const CREATE_SINGLE_PAGE_LABEL = i18n.translate(
  'xpack.synthetics.gettingStarted.createSinglePageLabel',
  {
    defaultMessage: 'Create a single page browser monitor',
  }
);

const GETTING_STARTED_LABEL = i18n.translate(
  'xpack.synthetics.gettingStarted.gettingStartedLabel',
  {
    defaultMessage: 'Getting Started Guide',
  }
);

const SELECT_DIFFERENT_MONITOR = i18n.translate(
  'xpack.synthetics.gettingStarted.gettingStartedLabel.selectDifferentMonitor',
  {
    defaultMessage: 'select a different monitor type',
  }
);

const OR_LABEL = i18n.translate('xpack.synthetics.gettingStarted.orLabel', {
  defaultMessage: 'Or',
});

const MONITORING_OVERVIEW_LABEL = i18n.translate('xpack.synthetics.overview.heading', {
  defaultMessage: 'Monitors',
});
