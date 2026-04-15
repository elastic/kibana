/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import type { FtrConfigProviderContext } from '@kbn/test';
import { configureHTTP2 } from '@kbn/test-suites-src/common/configure_http2';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));
  const functionalConfig = await readConfigFile(require.resolve('./kerberos.config'));

  const kerberosKeytabPath = resolve(__dirname, './packages/helpers/kerberos/krb5.keytab');
  const kerberosConfigPath = resolve(__dirname, './packages/helpers/kerberos/krb5.conf');

  return configureHTTP2({
    ...functionalConfig.getAll(),
    esTestCluster: {
      ...functionalConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.token.timeout=15s',
        'xpack.security.authc.realms.kerberos.kerb1.order=0',
        `xpack.security.authc.realms.kerberos.kerb1.keytab.path=${kerberosKeytabPath}`,
      ],

      // We're going to use the same TGT multiple times and during a short period of time, so we
      // have to disable replay cache so that ES doesn't complain about that.
      esJavaOpts: `-Djava.security.krb5.conf=${kerberosConfigPath} -Dsun.security.krb5.rcache=none`,
    },
    junit: {
      reportName: 'X-Pack Security API Integration Tests HTTP/2 (Kerberos)',
    },
  });
}
