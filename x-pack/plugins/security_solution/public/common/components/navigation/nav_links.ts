/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../lib/kibana';
import { useEnableExperimental } from '../../hooks/use_experimental_features';
import { useLicense } from '../../hooks/use_license';
import { getNavLinkItems } from '../../links';
import type { SecurityPageName } from '../../../app/types';
import type { NavLinkItem } from '../../links/types';

export const useAppNavLinks = (): NavLinkItem[] => {
  const license = useLicense();
  const enableExperimental = useEnableExperimental();
  const capabilities = useKibana().services.application.capabilities;

  return getNavLinkItems({ enableExperimental, license, capabilities });
};

export const useAppRootNavLink = (linkId: SecurityPageName): NavLinkItem | undefined => {
  return useAppNavLinks().find(({ id }) => id === linkId);
};
