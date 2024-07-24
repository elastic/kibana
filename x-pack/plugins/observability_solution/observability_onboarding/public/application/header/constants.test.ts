/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { customHeaderProps } from './constants';

describe('customHeaderProps', () => {
  it('handles k8s', () => {
    expect(customHeaderProps('/kubernetes?category=infra')).toMatchInlineSnapshot(`
      Object {
        "captionCopy": "This installation is tailored for configuring and collecting metrics and logs by deploying a new Elastic Agent within your host",
        "headlineCopy": "Setting up Kubernetes with Elastic Agent",
        "logo": "kubernetes",
      }
    `);
  });

  it('handles otel', () => {
    expect(customHeaderProps('/otel-logs')).toMatchInlineSnapshot(`
      Object {
        "captionCopy": "Collect logs and host metrics using the OTel collector.",
        "headlineCopy": "OpenTelemetry",
        "logo": "opentelemetry",
      }
    `);
  });

  it('handles system', () => {
    expect(customHeaderProps('/auto-detect')).toMatchInlineSnapshot(`
      Object {
        "captionCopy": "This installation scans your host and auto-detects log and metric files.",
        "euiIconType": "consoleApp",
        "headlineCopy": "Auto-detect logs and metrics",
      }
    `);
  });

  it('returns `null` for unhandled route', () => {
    expect(customHeaderProps('/systemLogs')).toBeNull();
  });
});
