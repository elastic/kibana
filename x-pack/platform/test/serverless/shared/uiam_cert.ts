/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnServerlessProjectType } from '@kbn/dev-utils';
import { KBN_SERVERLESS_UIAM_CERTS } from '@kbn/dev-utils';
import type { ServerlessProjectType } from '@kbn/es';

const UIAM_CERT_ARG_PREFIXES = [
  '--xpack.security.uiam.ssl.certificate=',
  '--xpack.security.uiam.ssl.key=',
];

/** Maps the `--serverless=` project type onto the one the UIAM certificates are named for. */
const UIAM_PROJECT_TYPES: Readonly<Record<ServerlessProjectType, KbnServerlessProjectType>> = {
  es: 'search',
  oblt: 'observability',
  security: 'security',
  vectordb: 'vectordb',
};

/**
 * Swaps the UIAM client certificate of `serverless/shared/config.base.ts`, which names a search
 * project, for the one of the given project type. UIAM reads Kibana's project type from the
 * certificate, and refuses to let Kibana assume the service accounts of a project of another type.
 *
 * Only for configs built on the serverless base config: on a stateful base this would add a
 * certificate that is not meant to be there.
 */
export const withUiamCertOfProject = (
  serverArgs: string[],
  serverlessProject: ServerlessProjectType
): string[] => {
  const { certPath, keyPath } = KBN_SERVERLESS_UIAM_CERTS[UIAM_PROJECT_TYPES[serverlessProject]];

  return [
    ...serverArgs.filter((arg) => !UIAM_CERT_ARG_PREFIXES.some((prefix) => arg.startsWith(prefix))),
    `--xpack.security.uiam.ssl.certificate=${certPath}`,
    `--xpack.security.uiam.ssl.key=${keyPath}`,
  ];
};
