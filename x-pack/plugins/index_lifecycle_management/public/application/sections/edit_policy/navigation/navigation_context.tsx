/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  FunctionComponent,
  createContext,
  useState,
  useContext,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import qs from 'query-string';

import { useKibana } from '../../../../shared_imports';

import { getPolicyEditPath, getPolicyCreatePath } from '../../../services/navigation';

import { useEditPolicyContext } from '../edit_policy_context';

export type PolicyView = { id: 'policy' } | { id: 'rollupAction'; phase: 'hot' | 'cold' };

interface ContextValue {
  currentView: PolicyView;
  goToPolicyView: (scrollToFieldWithId?: string) => void;
  setIsColdRollupActionBlocked: (value: boolean) => void;
}

const NavigationContext = createContext<ContextValue | null>(null);

export const NavigationContextProvider: FunctionComponent = ({ children }) => {
  const { policyName } = useEditPolicyContext();

  const [isColdRollupActionBlocked, setIsColdRollupActionBlocked] = useState(true);

  const { search } = useLocation();
  const history = useHistory();

  const {
    services: { breadcrumbService },
  } = useKibana();

  const currentView = useMemo<PolicyView>(() => {
    const { rollup } = qs.parse(search) as { rollup?: 'hot' | 'cold' };
    const rollupBlocked = rollup === 'cold' && isColdRollupActionBlocked;
    if (rollup && !rollupBlocked) {
      return { id: 'rollupAction', phase: rollup };
    }

    return { id: 'policy' };
  }, [search, isColdRollupActionBlocked]);

  const { id: currentViewId } = currentView;

  const goToPolicyView = useCallback(
    (scrollTo?: string) => {
      const newQueryParams = qs.parse(search);
      delete newQueryParams.rollup;
      history.push({
        search: qs.stringify(newQueryParams),
        hash: scrollTo,
      });
    },
    [history, search]
  );

  useEffect(() => {
    switch (currentViewId) {
      case 'policy':
        breadcrumbService.setBreadcrumbs({ type: 'editPolicy' });
        break;
      case 'rollupAction':
        breadcrumbService.setBreadcrumbs({
          type: 'configurePolicyRollup',
          payload: {
            editPolicyPath: policyName ? getPolicyEditPath(policyName) : getPolicyCreatePath(),
          },
        });
        break;
    }
  }, [breadcrumbService, search, currentViewId, policyName]);

  return (
    <NavigationContext.Provider
      value={{ currentView, goToPolicyView, setIsColdRollupActionBlocked }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigationContext = () => {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error(
      '"useNavigationContext" can only be used inside of "NavigationContextProvider"'
    );
  }
  return ctx;
};
