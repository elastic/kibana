"use strict";
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateApmOssIndexPaths = void 0;
const apmIndexConfigs = [
    ['error', 'apm_oss.errorIndices'],
    ['onboarding', 'apm_oss.onboardingIndices'],
    ['span', 'apm_oss.spanIndices'],
    ['transaction', 'apm_oss.transactionIndices'],
    ['metric', 'apm_oss.metricsIndices'],
];
function updateApmOssIndexPaths(attributes) {
    return apmIndexConfigs.reduce((attrs, [configPath, deprecatedConfigPath]) => {
        const indexConfig = attributes[deprecatedConfigPath];
        if (indexConfig) {
            attrs[configPath] = indexConfig;
        }
        return attrs;
    }, {});
}
exports.updateApmOssIndexPaths = updateApmOssIndexPaths;
