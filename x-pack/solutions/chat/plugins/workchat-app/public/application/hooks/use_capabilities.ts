/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { uiCapabilities } from '../../../common/features';
import { hasWorkchatCapability } from '../utils/has_capability';
import { useKibana } from './use_kibana';

type UiCapabilitiesKeys = keyof typeof uiCapabilities;

export const useCapabilities = (): Record<UiCapabilitiesKeys, boolean> => {
  const {
    services: {
      application: { capabilities },
    },
  } = useKibana();

  const caps = useMemo(() => {
    return Object.entries(uiCapabilities).reduce((map, [key, value]) => {
      map[key as UiCapabilitiesKeys] = hasWorkchatCapability(capabilities, value);
      return map;
    }, {} as Record<keyof typeof uiCapabilities, boolean>);
  }, [capabilities]);

  return caps;
};
