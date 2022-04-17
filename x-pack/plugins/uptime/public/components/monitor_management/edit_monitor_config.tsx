/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import {
  ConfigKey,
  MonitorFields,
  TLSFields,
  DataStream,
  ScheduleUnit,
  ThrottlingOptions,
} from '../../../common/runtime_types';
import { SyntheticsProviders } from '../fleet_package/contexts';
import { PolicyConfig } from '../fleet_package/types';
import { MonitorConfig } from './monitor_config/monitor_config';
import { DEFAULT_NAMESPACE_STRING } from '../../../common/constants';

interface Props {
  monitor: MonitorFields;
  throttling: ThrottlingOptions;
}

export const EditMonitorConfig = ({ monitor, throttling }: Props) => {
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
    let enableTLS = false;
    let enableZipUrlTLS = false;
    const getDefaultConfig = () => {
      const type: DataStream = monitor[ConfigKey.MONITOR_TYPE] as DataStream;

      const tlsConfig: TLSFields = {
        [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: monitor[ConfigKey.TLS_CERTIFICATE_AUTHORITIES],
        [ConfigKey.TLS_CERTIFICATE]: monitor[ConfigKey.TLS_CERTIFICATE],
        [ConfigKey.TLS_KEY]: monitor[ConfigKey.TLS_KEY],
        [ConfigKey.TLS_KEY_PASSPHRASE]: monitor[ConfigKey.TLS_KEY_PASSPHRASE],
        [ConfigKey.TLS_VERIFICATION_MODE]: monitor[ConfigKey.TLS_VERIFICATION_MODE],
        [ConfigKey.TLS_VERSION]: monitor[ConfigKey.TLS_VERSION],
      };

      enableTLS = Boolean(monitor[ConfigKey.TLS_VERIFICATION_MODE]);
      enableZipUrlTLS = Boolean(monitor[ConfigKey.ZIP_URL_TLS_VERIFICATION_MODE]);

      const formattedDefaultConfig: Partial<PolicyConfig> = {
        [type]: monitor,
      };

      return {
        fullConfig: formattedDefaultConfig,
        monitorTypeConfig: monitor,
        tlsConfig,
        monitorType: type,
        enableTLS,
        enableZipUrlTLS,
      };
    };

    return getDefaultConfig();
  }, [monitor]);

  return (
    <SyntheticsProviders
      policyDefaultValues={{
        throttling,
        defaultIsTLSEnabled: isTLSEnabled,
        defaultIsZipUrlTLSEnabled: isZipUrlTLSEnabled,
        defaultMonitorType: monitorType,
        defaultName: defaultConfig?.[ConfigKey.NAME] || '', // TODO - figure out typing concerns for name
        defaultNamespace: defaultConfig?.[ConfigKey.NAMESPACE] || DEFAULT_NAMESPACE_STRING,
        defaultLocations: defaultConfig[ConfigKey.LOCATIONS],
        isEditable: true,
        isZipUrlSourceEnabled: false,
        allowedScheduleUnits: [ScheduleUnit.MINUTES],
        runsOnService: true,
      }}
      httpDefaultValues={fullDefaultConfig[DataStream.HTTP]}
      tcpDefaultValues={fullDefaultConfig[DataStream.TCP]}
      icmpDefaultValues={fullDefaultConfig[DataStream.ICMP]}
      browserDefaultValues={fullDefaultConfig[DataStream.BROWSER]}
      tlsDefaultValues={defaultTLSConfig}
    >
      <MonitorConfig isEdit={true} />
    </SyntheticsProviders>
  );
};
