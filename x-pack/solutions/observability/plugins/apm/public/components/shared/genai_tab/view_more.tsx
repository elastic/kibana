/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

const MAX_HEIGHT = 300;

interface Props {
  children: React.ReactNode;
}

export function ViewMore({ children }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <div
        style={
          expanded ? undefined : { maxHeight: MAX_HEIGHT, overflow: 'hidden', position: 'relative' }
        }
      >
        {children}
        {!expanded && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: euiTheme.size.xxl,
              background: `linear-gradient(transparent, ${euiTheme.colors.backgroundBasePlain})`,
            }}
          />
        )}
      </div>
      <EuiSpacer size="xs" />
      <EuiText size="xs">
        <EuiLink data-test-subj="apmViewMoreLink" onClick={() => setExpanded((v) => !v)}>
          {expanded
            ? i18n.translate('xpack.apm.genAi.viewMore.viewLess', { defaultMessage: 'View less' })
            : i18n.translate('xpack.apm.genAi.viewMore.viewMore', { defaultMessage: 'View more' })}
        </EuiLink>
      </EuiText>
    </>
  );
}

/** Wraps content in ViewMore only when the estimated height would exceed the threshold. */
export function MaybeViewMore({
  content,
  children,
}: {
  content: string;
  children: React.ReactNode;
}) {
  // Rough heuristic: ~60 chars per line × 18px per line
  const estimatedHeight = Math.ceil(content.length / 60) * 18;
  if (estimatedHeight <= MAX_HEIGHT) return <>{children}</>;
  return <ViewMore>{children}</ViewMore>;
}
