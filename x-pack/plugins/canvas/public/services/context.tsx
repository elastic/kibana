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
import { CanvasServices, CanvasServiceProviders } from '.';

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
  const EnhancedType: FC<Props> = (props) => {
    const services = useServices();
    return createElement(type, { ...props, services });
  };
  return EnhancedType;
};

export const ServicesProvider: FC<{
  providers: CanvasServiceProviders;
  children: ReactElement<any>;
}> = ({ providers, children }) => {
  const value = {
    embeddables: providers.embeddables.getService(),
    expressions: providers.expressions.getService(),
    notify: providers.notify.getService(),
    platform: providers.platform.getService(),
    navLink: providers.navLink.getService(),
  };
  return <context.Provider value={value}>{children}</context.Provider>;
};
