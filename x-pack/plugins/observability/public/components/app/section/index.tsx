/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiPanel, EuiSpacer, EuiTitle, EuiButtonEmpty } from '@elastic/eui';
import React from 'react';
import { ErrorPanel } from './error_panel';
import { usePluginContext } from '../../../hooks/use_plugin_context';

interface AppLink {
  label: string;
  href?: string;
}

interface Props {
  title: string;
  hasError: boolean;
  children: React.ReactNode;
  appLink?: AppLink;
}

export function SectionContainer({ title, appLink, children, hasError }: Props) {
  const { core } = usePluginContext();
  return (
    <EuiPanel hasShadow={true} color="subdued">
      <EuiAccordion
        initialIsOpen
        id={title}
        buttonContentClassName="accordion-button"
        buttonContent={
          <EuiTitle size="xs">
            <h5>{title}</h5>
          </EuiTitle>
        }
        extraAction={
          appLink?.href && (
            <EuiButtonEmpty
              iconType={'sortRight'}
              size="xs"
              color="text"
              href={core.http.basePath.prepend(appLink.href)}
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
