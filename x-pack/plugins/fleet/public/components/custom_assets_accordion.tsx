/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FunctionComponent } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiNotificationBadge,
  EuiSpacer,
  EuiSplitPanel,
  EuiLink,
  EuiHorizontalRule,
} from '@elastic/eui';

import { AssetTitleMap } from '../applications/integrations/sections/epm/constants';
import { useStartServices } from '../hooks';
import { RedirectAppLinks } from '../../../../../src/plugins/kibana_react/public';

export interface CustomAssetsAccordionProps {
  views: Array<{
    name: string;
    url: string;
    description: string;
  }>;
  initialIsOpen?: boolean;
}

export const CustomAssetsAccordion: FunctionComponent<CustomAssetsAccordionProps> = ({
  views,
  initialIsOpen = false,
}) => {
  const { application } = useStartServices();

  return (
    <EuiAccordion
      initialIsOpen={initialIsOpen}
      buttonContent={
        <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="m">
              <h3>{AssetTitleMap.view}</h3>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge color="subdued" size="m">
              <h3>{views.length}</h3>
            </EuiNotificationBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      id="custom-assets"
    >
      <>
        <EuiSpacer size="m" />
        <EuiSplitPanel.Outer hasBorder hasShadow={false}>
          {views.map((view, index) => (
            <>
              <EuiSplitPanel.Inner grow={false} key={index}>
                <EuiText size="m">
                  <p>
                    <RedirectAppLinks application={application}>
                      <EuiLink href={view.url}>{view.name}</EuiLink>
                    </RedirectAppLinks>
                  </p>
                </EuiText>

                <EuiSpacer size="s" />
                <EuiText size="s" color="subdued">
                  <p>{view.description}</p>
                </EuiText>
              </EuiSplitPanel.Inner>
              {index + 1 < views.length && <EuiHorizontalRule margin="none" />}
            </>
          ))}
        </EuiSplitPanel.Outer>
      </>
    </EuiAccordion>
  );
};
