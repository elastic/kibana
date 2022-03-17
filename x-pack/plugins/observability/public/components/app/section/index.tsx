/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React from 'react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityAppServices } from '../../../application/types';
import { ErrorPanel } from './error_panel';
import { ExperimentalBadge } from '../../shared/experimental_badge';

interface AppLink {
  label: string;
  href?: string;
}

interface Props {
  title: string;
  hasError: boolean;
  children: React.ReactNode;
  appLink?: AppLink;
  showExperimentalBadge?: boolean;
}

export function SectionContainer({
  title,
  appLink,
  children,
  hasError,
  showExperimentalBadge = false,
}: Props) {
  const { http } = useKibana<ObservabilityAppServices>().services;
  return (
    <EuiPanel hasShadow={true} color="subdued">
      <EuiAccordion
        initialIsOpen
        id={title}
        buttonContentClassName="accordion-button"
        buttonContent={
          <>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h5>{title}</h5>
                </EuiTitle>
              </EuiFlexItem>

              {showExperimentalBadge && (
                <EuiFlexItem grow={false}>
                  <ExperimentalBadge />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </>
        }
        extraAction={
          appLink?.href && (
            <EuiButtonEmpty
              iconType={'sortRight'}
              size="xs"
              color="text"
              href={http.basePath.prepend(appLink.href)}
            >
              {appLink.label}
            </EuiButtonEmpty>
          )
        }
      >
        <>
          <EuiSpacer size="s" />
          <EuiPanel hasShadow={true}>{hasError ? <ErrorPanel /> : <>{children}</>}</EuiPanel>
        </>
      </EuiAccordion>
    </EuiPanel>
  );
}
