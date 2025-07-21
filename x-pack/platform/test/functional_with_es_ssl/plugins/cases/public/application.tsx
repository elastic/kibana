/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {
  EuiPageTemplate,
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiButton,
  EuiFlexGroup,
} from '@elastic/eui';
import { Router } from '@kbn/shared-ux-router';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { CasesPublicStart } from '@kbn/cases-plugin/public';
import { AttachmentType } from '@kbn/cases-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

export interface RenderAppProps {
  mountParams: AppMountParameters;
  coreStart: CoreStart;
  pluginsStart: { cases: CasesPublicStart };
}

interface CasesFixtureAppDeps {
  cases: CasesPublicStart;
}

const permissions = {
  all: true,
  create: true,
  read: true,
  update: true,
  delete: true,
  push: true,
  connectors: true,
  settings: true,
  createComment: true,
  reopenCase: true,
  assign: true,
};

const attachments = [{ type: AttachmentType.user as const, comment: 'test' }];

const CasesFixtureAppWithContext: React.FC<CasesFixtureAppDeps> = (props) => {
  const { cases } = props;

  const createCaseFlyout = cases.hooks.useCasesAddToNewCaseFlyout();
  const selectCaseModal = cases.hooks.useCasesAddToExistingCaseModal();

  return (
    <EuiPageTemplate>
      <EuiFlexGrid columns={1}>
        <EuiFlexItem>
          <EuiPanel style={{ height: 200 }}>
            <EuiTitle>
              <h2>Cases attachment hooks</h2>
            </EuiTitle>
            <EuiFlexGroup
              gutterSize="m"
              alignItems="center"
              responsive={false}
              wrap
              style={{ marginTop: '5px' }}
            >
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={() => createCaseFlyout.open({ attachments })}
                  data-test-subj="case-fixture-attach-to-new-case"
                >
                  {'Attach to a new case'}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={() => selectCaseModal.open({ getAttachments: () => attachments })}
                  data-test-subj="case-fixture-attach-to-existing-case"
                >
                  {'Attach to an existing case'}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </EuiPageTemplate>
  );
};

const CasesFixtureApp: React.FC<{ deps: RenderAppProps }> = ({ deps }) => {
  const { mountParams, coreStart, pluginsStart } = deps;
  const { history } = mountParams;
  const { cases } = pluginsStart;

  const CasesContext = cases.ui.getCasesContext();

  return (
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider
        services={{
          ...coreStart,
          ...pluginsStart,
        }}
      >
        <Router history={history}>
          <CasesContext owner={[]} permissions={permissions}>
            <CasesFixtureAppWithContext cases={cases} />
          </CasesContext>
        </Router>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
};

export const renderApp = (deps: RenderAppProps) => {
  const { mountParams } = deps;
  const { element } = mountParams;

  ReactDOM.render(<CasesFixtureApp deps={deps} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
