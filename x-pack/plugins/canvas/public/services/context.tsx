/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  useContext,
  createElement,
  createContext,
  ComponentType,
  FC,
  ReactElement,
} from 'react';
import { CanvasServices, CanvasServiceProviders, services } from '.';

export interface WithServicesProps {
  services: CanvasServices;
}

const defaultContextValue = {
  embeddables: {},
  expressions: {},
  notify: {},
  platform: {},
  navLink: {},
};

const context = createContext<CanvasServices>(defaultContextValue as CanvasServices);

export const useServices = () => useContext(context);
export const usePlatformService = () => useServices().platform;
export const useEmbeddablesService = () => useServices().embeddables;
export const useExpressionsService = () => useServices().expressions;
export const useNotifyService = () => useServices().notify;
export const useNavLinkService = () => useServices().navLink;

export const withServices = <Props extends WithServicesProps>(type: ComponentType<Props>) => {
  const EnhancedType: FC<Props> = (props) =>
    createElement(type, { ...props, services: useServices() });
  return EnhancedType;
};

export const ServicesProvider: FC<{
  providers?: Partial<CanvasServiceProviders>;
  children: ReactElement<any>;
}> = ({ providers = {}, children }) => {
  const specifiedProviders: CanvasServiceProviders = { ...services, ...providers };
  const value = {
    embeddables: specifiedProviders.embeddables.getService(),
    expressions: specifiedProviders.expressions.getService(),
    notify: specifiedProviders.notify.getService(),
    platform: specifiedProviders.platform.getService(),
    navLink: specifiedProviders.navLink.getService(),
  };
  return <context.Provider value={value}>{children}</context.Provider>;
};
