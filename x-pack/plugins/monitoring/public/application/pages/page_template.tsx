/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';
import React from 'react';
import { useTitle } from '../hooks/use_title';

export interface TabMenuItem {
  id: string;
  label: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
  testSubj: string;
}
interface PageTemplateProps {
  title: string;
  pageTitle?: string;
  children: React.ReactNode;
  tabs?: TabMenuItem[];
}

export const PageTemplate = ({ title, pageTitle, tabs, children }: PageTemplateProps) => {
  useTitle('', title);

  return (
    <div className="app-container">
      <EuiFlexGroup gutterSize="l" justifyContent="spaceBetween" responsive>
        <EuiFlexItem>
          <EuiFlexGroup
            gutterSize="none"
            justifyContent="spaceEvenly"
            direction="column"
            responsive
          >
            <EuiFlexItem>
              <div id="setupModeNav">
                <div
                  className="monSetupModeEnterButton__buttonWrapper"
                  data-test-subj="monitoringSetupModeBtn"
                >
                  <button
                    className="euiButton euiButton--primary euiButton--small"
                    type="button"
                    style={{ border: '2px solid red' }}
                  >
                    <span className="euiButtonContent euiButtonContent--iconRight euiButton__content">
                      <span className="euiButton__text">Enter setup mode</span>
                    </span>
                  </button>
                </div>
              </div>
            </EuiFlexItem>
            <EuiFlexItem className="monTopNavSecondItem">
              {pageTitle && (
                <div data-test-subj="monitoringPageTitle">
                  <EuiTitle size="xs">
                    <h1>{pageTitle}</h1>
                  </EuiTitle>
                </div>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <div>HERE GOES THE TIMEPICKER</div>
        </EuiFlexItem>
      </EuiFlexGroup>

      {tabs && (
        <EuiTabs>
          {tabs.map((item, idx) => {
            return (
              <EuiTab
                key={idx}
                disabled={item.disabled}
                onClick={item.onClick}
                title={item.label}
                data-test-subj={item.testSubj}
              >
                {item.label}
              </EuiTab>
            );
          })}
        </EuiTabs>
      )}
      <div>{children}</div>
    </div>
  );
};
