/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  ConfigKey,
  MonitorFields,
  TLSFields,
  PolicyConfig,
  DataStream,
} from '../components/fleet_package/types';
import { useTrackPageview } from '../../../observability/public';
import { SyntheticsProviders } from '../components/fleet_package/contexts';
import { MonitorConfig } from '../components/monitor_management/monitor_config';

export const EditMonitorPage: React.FC = () => {
  useTrackPageview({ app: 'uptime', path: 'edit-monitor' });
  useTrackPageview({ app: 'uptime', path: 'edit-monitor', delay: 15000 });

  const {
    enableTLS: isTLSEnabled,
    enableZipUrlTLS: isZipUrlTLSEnabled,
    fullConfig: fullDefaultConfig,
    monitorTypeConfig: defaultConfig,
    monitorType,
    tlsConfig: defaultTLSConfig,
  } = useMemo(() => {
    /* TODO: fetch current monitor to be edited from saved objects based on url param */
    const monitor = {} as Record<ConfigKey, any>; // fetch

    let enableTLS = false;
    let enableZipUrlTLS = false;
    const getDefaultConfig = () => {
      const type: DataStream = monitor[ConfigKey.MONITOR_TYPE] as DataStream;

      const configKeys: ConfigKey[] = Object.values(ConfigKey) || ([] as ConfigKey[]);
      const formattedDefaultConfigForMonitorType: MonitorFields = configKeys.reduce<MonitorFields>(
        (acc: MonitorFields, key: ConfigKey) => {
          return {
            ...acc,
            key,
          };
        },
        {} as MonitorFields
      );

      const tlsConfig: TLSFields = {
        [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]:
          formattedDefaultConfigForMonitorType[ConfigKey.TLS_CERTIFICATE_AUTHORITIES],
        [ConfigKey.TLS_CERTIFICATE]:
          formattedDefaultConfigForMonitorType[ConfigKey.TLS_CERTIFICATE],
        [ConfigKey.TLS_KEY]: formattedDefaultConfigForMonitorType[ConfigKey.TLS_KEY],
        [ConfigKey.TLS_KEY_PASSPHRASE]:
          formattedDefaultConfigForMonitorType[ConfigKey.TLS_KEY_PASSPHRASE],
        [ConfigKey.TLS_VERIFICATION_MODE]:
          formattedDefaultConfigForMonitorType[ConfigKey.TLS_VERIFICATION_MODE],
        [ConfigKey.TLS_VERSION]: formattedDefaultConfigForMonitorType[ConfigKey.TLS_VERSION],
      };

      enableTLS = Boolean(formattedDefaultConfigForMonitorType[ConfigKey.TLS_VERIFICATION_MODE]);
      enableZipUrlTLS = Boolean(
        formattedDefaultConfigForMonitorType[ConfigKey.ZIP_URL_TLS_VERIFICATION_MODE]
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
      policyDefaultValues={{
        defaultIsTLSEnabled: isTLSEnabled,
        defaultIsZipUrlTLSEnabled: isZipUrlTLSEnabled,
        defaultMonitorType: monitorType,
        defaultName: defaultConfig?.name || '', // TODO - figure out typing concerns for name
        defaultLocations: [], // TODO - figure out locations
        isEditable: true,
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
