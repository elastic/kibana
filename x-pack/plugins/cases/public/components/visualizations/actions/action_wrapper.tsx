/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';

import { useIsDarkTheme } from '../../../common/use_is_dark_theme';
import { SECURITY_SOLUTION_OWNER } from '../../../../common';
import type { CasesUIActionProps } from './types';
import { KibanaContextProvider, useKibana } from '../../../common/lib/kibana';
import CasesProvider from '../../cases_context';
import { getCaseOwnerByAppId } from '../../../../common/utils/owner';
import { canUseCases } from '../../../client/helpers/can_use_cases';

export const DEFAULT_DARK_MODE = 'theme:darkMode' as const;

interface Props {
  caseContextProps: CasesUIActionProps['caseContextProps'];
  currentAppId?: string;
}

const ActionWrapperWithContext: React.FC<PropsWithChildren<Props>> = ({
  children,
  caseContextProps,
  currentAppId,
}) => {
  const { application } = useKibana().services;
  const isDarkTheme = useIsDarkTheme();

  const owner = getCaseOwnerByAppId(currentAppId);
  const casePermissions = canUseCases(application.capabilities)(owner ? [owner] : undefined);
  // TODO: Remove when https://github.com/elastic/kibana/issues/143201 is developed
  const syncAlerts = owner === SECURITY_SOLUTION_OWNER;

  return (
    <EuiThemeProvider darkMode={isDarkTheme}>
      <CasesProvider
        value={{
          ...caseContextProps,
          owner: owner ? [owner] : [],
          permissions: casePermissions,
          features: { alerts: { sync: syncAlerts } },
        }}
      >
        {children}
      </CasesProvider>
    </EuiThemeProvider>
  );
};

ActionWrapperWithContext.displayName = 'ActionWrapperWithContext';

type ActionWrapperComponentProps = PropsWithChildren<
  CasesUIActionProps & { currentAppId?: string }
>;

const ActionWrapperComponent: React.FC<ActionWrapperComponentProps> = ({
  core,
  plugins,
  storage,
  history,
  children,
  caseContextProps,
  currentAppId,
}) => {
  return (
    <KibanaContextProvider
      services={{
        ...core,
        ...plugins,
        storage,
      }}
    >
      <Router history={history}>
        <ActionWrapperWithContext caseContextProps={caseContextProps} currentAppId={currentAppId}>
          {children}
        </ActionWrapperWithContext>
      </Router>
    </KibanaContextProvider>
  );
};

ActionWrapperComponent.displayName = 'ActionWrapper';

export const ActionWrapper = React.memo(ActionWrapperComponent);
