/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import SemVer from 'semver/classes/semver';

/*
 * These constants are used only in tests to add conditional logic based on Kibana version
 * On master, the version should represent the next major version (e.g., master --> 8.0.0)
 * The release branch should match the release version (e.g., 7.x --> 7.0.0)
 */
export const mockKibanaVersion = '8.0.0';
export const mockKibanaSemverVersion = new SemVer(mockKibanaVersion);
