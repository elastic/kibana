/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPage, EuiPageBody, EuiPageSection, EuiTitle, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';

interface SourcemapViewProps {
  core: CoreStart;
}

/**
 * Placeholder view for JavaScript source map resolution.
 * TODO: Implement source map upload UI and stacktrace resolution display.
 */
export function SourcemapView(_props: SourcemapViewProps) {
  return (
    <EuiPage paddingSize="l">
      <EuiPageBody>
        <EuiPageSection>
          <EuiTitle size="l">
            <h1>
              {i18n.translate('xpack.clientApps.javascript.sourcemap.title', {
                defaultMessage: 'JavaScript Source Map Resolution',
              })}
            </h1>
          </EuiTitle>
          <EuiCallOut
            announceOnMount={false}
            title={i18n.translate('xpack.clientApps.javascript.sourcemap.comingSoonTitle', {
              defaultMessage: 'Coming soon',
            })}
            color="primary"
            iconType="iInCircle"
            style={{ marginTop: 24 }}
          >
            <p>
              {i18n.translate('xpack.clientApps.javascript.sourcemap.comingSoonBody', {
                defaultMessage:
                  'JavaScript source map resolution is not yet implemented. This platform will support uploading source maps and resolving minified stacktraces back to original source locations.',
              })}
            </p>
          </EuiCallOut>
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
}
