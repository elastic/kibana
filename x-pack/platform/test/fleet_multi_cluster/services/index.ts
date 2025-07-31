/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as kibanaFunctionalServices } from '@kbn/test-suites-src/functional/services';
import { RemoteEsProvider } from '@kbn/test-suites-src/functional/services/remote_es/remote_es';
import { RemoteEsArchiverProvider } from '@kbn/test-suites-src/functional/services/remote_es/remote_es_archiver';

export const services = {
  ...kibanaFunctionalServices,
  remoteEs: RemoteEsProvider,
  remoteEsArchiver: RemoteEsArchiverProvider,
};
