/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  ConfigKeys,
  ICustomFields,
  ITLSFields,
  PolicyConfig,
  DataStream,
} from '../components/fleet_package/types';
import { useTrackPageview } from '../../../observability/public';
import { SyntheticsProviders } from '../components/fleet_package/contexts';
import { MonitorConfig } from '../components/monitor_management/monitor_config';

export const EditMonitorPage: React.FC = () => {
  //   useInitApp();

  useTrackPageview({ app: 'uptime', path: 'monitor/add' });
  useTrackPageview({ app: 'uptime', path: 'monitor/add', delay: 15000 });

  const {
    enableTLS: isTLSEnabled,
    enableZipUrlTLS: isZipUrlTLSEnabled,
    fullConfig: fullDefaultConfig,
    monitorTypeConfig: defaultConfig,
    monitorType,
    tlsConfig: defaultTLSConfig,
  } = useMemo(() => {
    /* TODO: fetch current monitor to be edited from saved objects based on url param */
    const monitor = {} as Record<ConfigKeys, any>; // fetch

    let enableTLS = false;
    let enableZipUrlTLS = false;
    const getDefaultConfig = () => {
      const type: DataStream = monitor[ConfigKeys.MONITOR_TYPE] as DataStream;

      const configKeys: ConfigKeys[] = Object.values(ConfigKeys) || ([] as ConfigKeys[]);
      const formattedDefaultConfigForMonitorType: ICustomFields = configKeys.reduce<ICustomFields>(
        (acc: ICustomFields, key: ConfigKeys) => {
          return {
            ...acc,
            key,
          };
        },
        {} as ICustomFields
      );

      const tlsConfig: ITLSFields = {
        [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]:
          formattedDefaultConfigForMonitorType[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES],
        [ConfigKeys.TLS_CERTIFICATE]:
          formattedDefaultConfigForMonitorType[ConfigKeys.TLS_CERTIFICATE],
        [ConfigKeys.TLS_KEY]: formattedDefaultConfigForMonitorType[ConfigKeys.TLS_KEY],
        [ConfigKeys.TLS_KEY_PASSPHRASE]:
          formattedDefaultConfigForMonitorType[ConfigKeys.TLS_KEY_PASSPHRASE],
        [ConfigKeys.TLS_VERIFICATION_MODE]:
          formattedDefaultConfigForMonitorType[ConfigKeys.TLS_VERIFICATION_MODE],
        [ConfigKeys.TLS_VERSION]: formattedDefaultConfigForMonitorType[ConfigKeys.TLS_VERSION],
      };

      enableTLS = Boolean(formattedDefaultConfigForMonitorType[ConfigKeys.TLS_VERIFICATION_MODE]);
      enableZipUrlTLS = Boolean(
        formattedDefaultConfigForMonitorType[ConfigKeys.ZIP_URL_TLS_VERIFICATION_MODE]
      );

      const formattedDefaultConfig: Partial<PolicyConfig> = {
        [type]: formattedDefaultConfigForMonitorType,
      };

      return {
        fullConfig: formattedDefaultConfig,
        monitorTypeConfig: formattedDefaultConfigForMonitorType,
        tlsConfig,
        monitorType: type,
        enableTLS,
        enableZipUrlTLS,
      };
    };

    return getDefaultConfig();
  }, []);

  return (
    <SyntheticsProviders
      defaultPolicyValues={{
        defaultIsTLSEnabled: isTLSEnabled,
        defaultIsZipUrlTLSEnabled: isZipUrlTLSEnabled,
        defaultMonitorType: monitorType,
        isEditable: true,
        // name: defaultConfig?.name, // TODO - figure out typing concerns for name
        // locations: defaultConfig?.locations, // TODO - figure out locations
      }}
      httpDefaultValues={fullDefaultConfig[DataStream.HTTP]}
      tcpDefaultValues={fullDefaultConfig[DataStream.TCP]}
      icmpDefaultValues={fullDefaultConfig[DataStream.ICMP]}
      browserDefaultValues={fullDefaultConfig[DataStream.BROWSER]}
      tlsDefaultValues={defaultTLSConfig}
    >
      <MonitorConfig />
    </SyntheticsProviders>
  );
};
